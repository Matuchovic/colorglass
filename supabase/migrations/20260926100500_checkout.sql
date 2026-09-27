-- =============================================================================
-- COLOR 0006 · Checkout: serverová kalkulace ceny (jediný zdroj pravdy), založení
-- objednávky s atomickou rezervací skladu a čerpáním kupónu, stavový automat
-- objednávek a plateb (idempotentní webhooky), expirace rezervací, vratky.
-- =============================================================================

-- Řádek kalkulace (pracovní struktura bez dočasných tabulek)
create type public.quote_line as (
  idx integer, item_id uuid, variant_id uuid, product_id uuid, brand_id uuid, slug text, name text,
  variant_name text, sku text, image text, quantity integer, unit_price bigint, compare_at bigint,
  tax_rate integer, available integer, backorder boolean, active boolean, weight integer,
  eligible boolean, discount bigint
);

-- Kalkulace košíku: položky, sleva, doprava, platba, DPH. Jediný zdroj pravdy o ceně.
create or replace function public.pricing_quote(
  p_cart_id uuid,
  p_market public.market_code,
  p_shipping_method_id uuid default null,
  p_payment_method_code text default null,
  p_discount_code text default null,
  p_email text default null,
  p_user_id uuid default null
) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  v_loc text := public.market_locale(p_market);
  v_market public.markets;
  v_arr public.quote_line[];
  v_l public.quote_line;
  v_n integer;
  i integer;
  v_lines jsonb;
  v_issues jsonb := '[]'::jsonb;
  v_subtotal bigint := 0;
  v_weight bigint := 0;
  v_count integer := 0;
  v_eligible bigint := 0;
  v_discount_amount bigint := 0;
  v_free_shipping boolean := false;
  v_disc public.discounts;
  v_code public.discount_codes;
  v_disc_status text;
  v_disc_json jsonb;
  v_min bigint;
  v_shipping_json jsonb := '[]'::jsonb;
  v_ship record;
  v_selected_ship jsonb;
  v_shipping_total bigint := 0;
  v_cod_allowed boolean := true;
  v_payment_json jsonb := '[]'::jsonb;
  v_pay record;
  v_selected_pay jsonb;
  v_fee bigint := 0;
  v_std_rate integer;
  v_goods bigint;
  v_alloc bigint;
  v_remaining bigint;
  v_largest integer;
  v_vat jsonb;
  v_tax_total bigint := 0;
  v_threshold bigint;
begin
  select * into v_market from public.markets where code = p_market and is_active;
  if not found then raise exception 'MARKET_INACTIVE' using errcode = '22023'; end if;
  select rate_bps into v_std_rate from public.tax_rates where tax_class = 'standard' and market = p_market;
  v_std_rate := coalesce(v_std_rate, 0);

  -- 1) Položky s aktuální cenou, sazbou DPH a dostupností
  select array_agg(row(
           x.rn, x.item_id, x.variant_id, x.product_id, x.brand_id, x.slug, x.name, x.variant_name, x.sku, x.image,
           x.quantity, x.price, x.compare_at, x.rate, x.available, x.backorder, x.active, x.weight, false, 0
         )::public.quote_line order by x.rn)
    into v_arr
    from (
      select row_number() over (order by ci.created_at, ci.id)::int as rn, ci.id as item_id, v.id as variant_id,
             p.id as product_id, p.brand_id, p.slug, public.tr(p.translations, v_loc, 'name', p.name) as name,
             v.name as variant_name, v.sku,
             coalesce((select pi.url from public.product_images pi where pi.id = v.image_id),
                      (select pi.url from public.product_images pi where pi.product_id = p.id
                        order by pi.sort_order, pi.created_at limit 1)) as image,
             ci.quantity, coalesce(pp.price, 0) as price, pp.compare_at_price as compare_at,
             coalesce(tr.rate_bps, v_std_rate) as rate,
             greatest(coalesce(i.quantity_on_hand, 0) - coalesce(i.quantity_reserved, 0), 0)::int as available,
             coalesce(i.allow_backorder, false) as backorder,
             (p.is_active and v.is_active and pp.price is not null) as active,
             coalesce(v.weight_grams, p.weight_grams, 0) as weight
        from public.cart_items ci
        join public.product_variants v on v.id = ci.variant_id
        join public.products p on p.id = v.product_id
        left join public.product_prices pp on pp.variant_id = v.id and pp.market = p_market
        left join public.tax_rates tr on tr.tax_class = p.tax_class and tr.market = p_market
        left join public.inventory i on i.variant_id = v.id
       where ci.cart_id = p_cart_id) x;
  v_n := coalesce(array_length(v_arr, 1), 0);

  for i in 1 .. v_n loop
    v_l := v_arr[i];
    if not v_l.active then
      v_issues := v_issues || jsonb_build_array(jsonb_build_object('code', 'UNAVAILABLE', 'item_id', v_l.item_id));
    else
      if not v_l.backorder and v_l.available < v_l.quantity then
        v_issues := v_issues || jsonb_build_array(jsonb_build_object(
          'code', case when v_l.available = 0 then 'OUT_OF_STOCK' else 'INSUFFICIENT_STOCK' end,
          'item_id', v_l.item_id, 'available', v_l.available));
      end if;
      v_subtotal := v_subtotal + v_l.unit_price * v_l.quantity;
      v_weight := v_weight + v_l.weight::bigint * v_l.quantity;
      v_count := v_count + v_l.quantity;
    end if;
  end loop;

  -- 2) Slevový kód (validace a rozsah platnosti)
  if nullif(btrim(coalesce(p_discount_code, '')), '') is not null then
    select * into v_code from public.discount_codes where upper(code) = upper(btrim(p_discount_code));
    if not found then
      v_disc_status := 'NOT_FOUND';
    else
      select * into v_disc from public.discounts where id = v_code.discount_id;
      v_min := case v_market.currency when 'CZK' then v_disc.min_subtotal_czk else v_disc.min_subtotal_eur end;
      if not v_disc.is_active or not v_code.is_active then v_disc_status := 'INACTIVE';
      elsif v_disc.starts_at is not null and v_disc.starts_at > now() then v_disc_status := 'NOT_STARTED';
      elsif v_disc.ends_at is not null and v_disc.ends_at <= now() then v_disc_status := 'EXPIRED';
      elsif not (p_market = any(v_disc.markets)) then v_disc_status := 'MARKET';
      elsif v_disc.type = 'fixed_amount'
            and (case v_market.currency when 'CZK' then v_disc.amount_czk else v_disc.amount_eur end) is null then
        v_disc_status := 'MARKET';
      elsif (v_disc.usage_limit is not null and v_disc.times_used >= v_disc.usage_limit)
            or (v_code.usage_limit is not null and v_code.times_used >= v_code.usage_limit) then
        v_disc_status := 'USAGE_LIMIT';
      elsif v_disc.usage_limit_per_customer is not null and (p_email is not null or p_user_id is not null) and (
              select count(*) from public.discount_redemptions dr
               where dr.discount_id = v_disc.id
                 and (lower(dr.email) = lower(p_email) or (p_user_id is not null and dr.user_id = p_user_id))
            ) >= v_disc.usage_limit_per_customer then
        v_disc_status := 'CUSTOMER_LIMIT';
      elsif v_min is not null and v_subtotal < v_min then
        v_disc_status := 'MIN_SUBTOTAL';
      else
        for i in 1 .. v_n loop
          v_l := v_arr[i];
          v_l.eligible := v_l.active and (
            v_disc.applies_to = 'all'
            or (v_disc.applies_to = 'products' and exists (
                  select 1 from public.discount_targets t
                   where t.discount_id = v_disc.id and t.target_type = 'product' and t.target_id = v_l.product_id))
            or (v_disc.applies_to = 'brands' and exists (
                  select 1 from public.discount_targets t
                   where t.discount_id = v_disc.id and t.target_type = 'brand' and t.target_id = v_l.brand_id))
            or (v_disc.applies_to = 'categories' and exists (
                  select 1 from public.discount_targets t
                    join public.categories tc on tc.id = t.target_id
                    join public.product_categories pc on pc.product_id = v_l.product_id
                    join public.categories c on c.id = pc.category_id
                   where t.discount_id = v_disc.id and t.target_type = 'category'
                     and (c.path = tc.path or c.path like tc.path || '/%'))));
          v_arr[i] := v_l;
          if v_l.eligible then v_eligible := v_eligible + v_l.unit_price * v_l.quantity; end if;
        end loop;
        if v_eligible = 0 then
          v_disc_status := 'NOT_ELIGIBLE';
        else
          v_disc_status := 'APPLIED';
          if v_disc.type = 'percentage' then
            v_discount_amount := floor(v_eligible::numeric * v_disc.percent_bps / 10000)::bigint;
          elsif v_disc.type = 'fixed_amount' then
            v_discount_amount := least(case v_market.currency when 'CZK' then v_disc.amount_czk else v_disc.amount_eur end, v_eligible);
          else
            v_free_shipping := true;
          end if;
        end if;
      end if;
    end if;

    -- Rozpočítání slevy na řádky (poměrně, zbytek na největší řádek) – nutné pro DPH a vratky
    if v_discount_amount > 0 then
      v_remaining := v_discount_amount;
      v_largest := null;
      for i in 1 .. v_n loop
        v_l := v_arr[i];
        if v_l.eligible then
          v_alloc := floor(v_discount_amount::numeric * (v_l.unit_price * v_l.quantity) / v_eligible)::bigint;
          v_l.discount := v_alloc;
          v_arr[i] := v_l;
          v_remaining := v_remaining - v_alloc;
          if v_largest is null or v_l.unit_price * v_l.quantity > v_arr[v_largest].unit_price * v_arr[v_largest].quantity then
            v_largest := i;
          end if;
        end if;
      end loop;
      if v_remaining > 0 then
        v_l := v_arr[v_largest];
        v_l.discount := v_l.discount + v_remaining;
        v_arr[v_largest] := v_l;
      end if;
    end if;

    v_disc_json := jsonb_build_object(
      'code', upper(btrim(p_discount_code)),
      'status', v_disc_status,
      'discount_id', case when v_disc_status = 'APPLIED' then v_disc.id end,
      'code_id', case when v_disc_status = 'APPLIED' then v_code.id end,
      'type', v_disc.type,
      'name', case when v_disc_status = 'APPLIED' then v_disc.name end,
      'amount', v_discount_amount,
      'free_shipping', v_free_shipping,
      'min_subtotal', case when v_disc_status = 'MIN_SUBTOTAL' then v_min end);
  end if;

  v_goods := v_subtotal - v_discount_amount;

  -- 3) Doprava (zdarma nad limitem trhu / metody nebo kupónem; hmotnostní limit)
  for v_ship in
    select sm.*, smm.price as market_price, coalesce(smm.free_from, v_market.free_shipping_threshold) as free_from
      from public.shipping_methods sm
      join public.shipping_method_markets smm on smm.method_id = sm.id and smm.market = p_market and smm.is_active
     where sm.is_active
     order by sm.sort_order, smm.price
  loop
    v_shipping_json := v_shipping_json || jsonb_build_array(jsonb_build_object(
      'id', v_ship.id, 'code', v_ship.code, 'carrier', v_ship.carrier, 'type', v_ship.type,
      'name', public.tr(v_ship.translations, v_loc, 'name', v_ship.name),
      'description', public.tr(v_ship.translations, v_loc, 'description', v_ship.description),
      'base_price', v_ship.market_price,
      'price', case when v_free_shipping or (v_ship.free_from is not null and v_goods >= v_ship.free_from)
                    then 0 else v_ship.market_price end,
      'free_from', v_ship.free_from,
      'delivery_days_min', v_ship.delivery_days_min, 'delivery_days_max', v_ship.delivery_days_max,
      'cod_allowed', v_ship.cod_allowed,
      'available', v_ship.max_weight_grams is null or v_weight <= v_ship.max_weight_grams));
  end loop;

  if p_shipping_method_id is not null then
    select e into v_selected_ship from jsonb_array_elements(v_shipping_json) e
     where (e ->> 'id')::uuid = p_shipping_method_id and (e ->> 'available')::boolean;
    if v_selected_ship is null then
      v_issues := v_issues || jsonb_build_array(jsonb_build_object('code', 'SHIPPING_INVALID'));
    else
      v_shipping_total := (v_selected_ship ->> 'price')::bigint;
      v_cod_allowed := (v_selected_ship ->> 'cod_allowed')::boolean;
    end if;
  end if;

  -- 4) Platební metody a poplatky
  for v_pay in
    select pm.*, pmm.fee
      from public.payment_methods pm
      join public.payment_method_markets pmm on pmm.method_code = pm.code and pmm.market = p_market and pmm.is_active
     where pm.is_active
     order by pm.sort_order
  loop
    v_payment_json := v_payment_json || jsonb_build_array(jsonb_build_object(
      'code', v_pay.code, 'provider', v_pay.provider, 'is_online', v_pay.is_online,
      'name', public.tr(v_pay.translations, v_loc, 'name', v_pay.name),
      'description', public.tr(v_pay.translations, v_loc, 'description', v_pay.description),
      'fee', v_pay.fee,
      'available', v_pay.provider <> 'cod' or v_cod_allowed));
  end loop;

  if p_payment_method_code is not null then
    select e into v_selected_pay from jsonb_array_elements(v_payment_json) e
     where e ->> 'code' = p_payment_method_code and (e ->> 'available')::boolean;
    if v_selected_pay is null then
      v_issues := v_issues || jsonb_build_array(jsonb_build_object('code', 'PAYMENT_INVALID'));
    else
      v_fee := (v_selected_pay ->> 'fee')::bigint;
    end if;
  end if;

  -- 5) Řádky a DPH z cen s daní; doprava a poplatek standardní sazbou trhu
  select coalesce(jsonb_agg(jsonb_build_object(
           'item_id', l.item_id, 'variant_id', l.variant_id, 'product_id', l.product_id, 'slug', l.slug,
           'name', l.name, 'variant_name', l.variant_name, 'sku', l.sku, 'image', l.image,
           'quantity', l.quantity, 'unit_price', l.unit_price, 'compare_at', l.compare_at,
           'tax_rate_bps', l.tax_rate, 'line_subtotal', l.unit_price * l.quantity,
           'discount_amount', l.discount, 'line_total', l.unit_price * l.quantity - l.discount,
           'tax_amount', round((l.unit_price * l.quantity - l.discount)::numeric * l.tax_rate / (10000 + l.tax_rate))::bigint,
           'available', l.available, 'backorder', l.backorder, 'active', l.active, 'weight_grams', l.weight,
           'max_quantity', case when l.backorder then 99 else least(99, l.available) end)
         order by l.idx), '[]'::jsonb)
    into v_lines
    from unnest(v_arr) l;

  with parts as (
    select l.tax_rate as rate, (l.unit_price * l.quantity - l.discount) as gross
      from unnest(v_arr) l where l.active
    union all select v_std_rate, v_shipping_total where v_shipping_total > 0
    union all select v_std_rate, v_fee where v_fee > 0
  ), grouped as (
    select rate, sum(gross)::bigint as gross,
           sum(round(gross::numeric * rate / (10000 + rate)))::bigint as tax
      from parts group by rate
  )
  select coalesce(jsonb_agg(jsonb_build_object('rate_bps', rate, 'total', gross, 'tax', tax, 'base', gross - tax)
                            order by rate desc), '[]'::jsonb),
         coalesce(sum(tax), 0)
    into v_vat, v_tax_total
    from grouped;

  v_threshold := v_market.free_shipping_threshold;
  if v_count = 0 then
    v_issues := v_issues || jsonb_build_array(jsonb_build_object('code', 'CART_EMPTY'));
  end if;

  return jsonb_build_object(
    'market', p_market,
    'currency', v_market.currency,
    'locale', v_loc,
    'lines', v_lines,
    'item_count', v_count,
    'subtotal', v_subtotal,
    'discount', v_disc_json,
    'discount_total', v_discount_amount,
    'goods_total', v_goods,
    'free_shipping_threshold', v_threshold,
    'free_shipping_remaining', case when v_threshold is null or v_free_shipping then 0 else greatest(v_threshold - v_goods, 0) end,
    'shipping_methods', v_shipping_json,
    'shipping', v_selected_ship,
    'payment_methods', v_payment_json,
    'payment', v_selected_pay,
    'shipping_total', v_shipping_total,
    'payment_fee_total', v_fee,
    'grand_total', v_goods + v_shipping_total + v_fee,
    'tax_total', v_tax_total,
    'vat_breakdown', v_vat,
    'weight_grams', v_weight,
    'issues', v_issues);
end $$;

-- -----------------------------------------------------------------------------
-- Založení objednávky. Idempotentní (klíč), atomické: zámek skladu, kontrola ceny,
-- rezervace, čerpání kupónu, vznik platby. Při jakékoli chybě se nic neuloží.
-- -----------------------------------------------------------------------------
create or replace function public.create_order(p jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_key text := p ->> 'idempotency_key';
  v_existing public.orders;
  v_cart public.carts;
  v_market public.market_code := (p ->> 'market')::public.market_code;
  v_user uuid := nullif(p ->> 'user_id', '')::uuid;
  v_email text := lower(btrim(p ->> 'email'));
  v_quote jsonb;
  v_issue jsonb;
  v_ship jsonb;
  v_pay jsonb;
  v_disc jsonb;
  v_order_id uuid := gen_random_uuid();
  v_number text;
  v_status public.order_status;
  v_expires timestamptz;
  v_provider public.payment_provider;
  v_payment_id uuid;
  v_line jsonb;
  v_updated integer;
  v_billing jsonb := p -> 'billing';
  v_shipping_addr jsonb := p -> 'shipping_address';
begin
  if v_key is null or char_length(v_key) < 16 then raise exception 'IDEMPOTENCY_KEY_REQUIRED' using errcode = '22023'; end if;
  perform pg_advisory_xact_lock(hashtextextended('order:' || v_key, 0));

  select * into v_existing from public.orders where idempotency_key = v_key;
  if found then
    return jsonb_build_object('order_id', v_existing.id, 'number', v_existing.number, 'status', v_existing.status,
      'grand_total', v_existing.grand_total, 'currency', v_existing.currency, 'provider', v_existing.payment_provider,
      'payment_id', (select id from public.payments where order_id = v_existing.id order by created_at desc limit 1),
      'existing', true);
  end if;

  if v_user is not null and exists (select 1 from public.profiles where id = v_user and is_blocked) then
    raise exception 'CUSTOMER_BLOCKED' using errcode = '42501';
  end if;

  select * into v_cart from public.carts where id = (p ->> 'cart_id')::uuid and status = 'active' for update;
  if not found then raise exception 'CART_NOT_FOUND' using errcode = 'P0002'; end if;

  -- Zámek skladových řádků v deterministickém pořadí (bez deadlocků)
  perform 1 from public.inventory i
    where i.variant_id in (select ci.variant_id from public.cart_items ci where ci.cart_id = v_cart.id)
    order by i.variant_id
    for update;

  v_quote := public.pricing_quote(v_cart.id, v_market, (p ->> 'shipping_method_id')::uuid,
                                  p ->> 'payment_method_code', nullif(p ->> 'discount_code', ''), v_email, v_user);

  for v_issue in select * from jsonb_array_elements(v_quote -> 'issues') loop
    raise exception '%', (v_issue ->> 'code') using errcode = 'P0001',
      detail = coalesce(v_issue ->> 'item_id', '');
  end loop;

  v_disc := nullif(v_quote -> 'discount', 'null'::jsonb);
  if v_disc is not null and v_disc ->> 'status' <> 'APPLIED' then
    raise exception 'DISCOUNT_%', v_disc ->> 'status' using errcode = 'P0001';
  end if;

  if (p ->> 'expected_total') is not null and (p ->> 'expected_total')::bigint <> (v_quote ->> 'grand_total')::bigint then
    raise exception 'TOTAL_CHANGED' using errcode = 'P0001', detail = v_quote ->> 'grand_total';
  end if;

  v_ship := nullif(v_quote -> 'shipping', 'null'::jsonb);
  v_pay := nullif(v_quote -> 'payment', 'null'::jsonb);
  if v_ship is null then raise exception 'SHIPPING_INVALID' using errcode = 'P0001'; end if;
  if v_pay is null then raise exception 'PAYMENT_INVALID' using errcode = 'P0001'; end if;
  if v_ship ->> 'type' = 'pickup_point' and (p -> 'pickup_point' ->> 'id') is null then
    raise exception 'PICKUP_POINT_REQUIRED' using errcode = 'P0001';
  end if;
  if v_ship ->> 'type' = 'address' and (v_shipping_addr is null or v_shipping_addr ->> 'street' is null) then
    raise exception 'ADDRESS_REQUIRED' using errcode = 'P0001';
  end if;
  if v_billing is null or v_billing ->> 'first_name' is null then
    raise exception 'BILLING_REQUIRED' using errcode = 'P0001';
  end if;

  -- Čerpání kupónu – podmíněný UPDATE je atomický i při souběhu
  if v_disc is not null then
    perform pg_advisory_xact_lock(hashtextextended('discount:' || (v_disc ->> 'discount_id') || ':' || v_email, 0));
    if exists (select 1 from public.discounts d where d.id = (v_disc ->> 'discount_id')::uuid
                 and d.usage_limit_per_customer is not null
                 and (select count(*) from public.discount_redemptions dr
                       where dr.discount_id = d.id and (lower(dr.email) = v_email or (v_user is not null and dr.user_id = v_user)))
                     >= d.usage_limit_per_customer) then
      raise exception 'DISCOUNT_CUSTOMER_LIMIT' using errcode = 'P0001';
    end if;
    update public.discounts set times_used = times_used + 1
     where id = (v_disc ->> 'discount_id')::uuid and (usage_limit is null or times_used < usage_limit);
    get diagnostics v_updated = row_count;
    if v_updated = 0 then raise exception 'DISCOUNT_USAGE_LIMIT' using errcode = 'P0001'; end if;
    update public.discount_codes set times_used = times_used + 1
     where id = (v_disc ->> 'code_id')::uuid and (usage_limit is null or times_used < usage_limit);
    get diagnostics v_updated = row_count;
    if v_updated = 0 then raise exception 'DISCOUNT_USAGE_LIMIT' using errcode = 'P0001'; end if;
  end if;

  v_provider := (v_pay ->> 'provider')::public.payment_provider;
  if v_provider = 'cod' then
    v_status := 'new';
  else
    v_status := 'awaiting_payment';
    v_expires := now() + case when v_provider = 'bank_transfer'
      then make_interval(days => coalesce((public.setting('orders.bank_transfer_days') #>> '{}')::int, 7))
      else make_interval(mins => coalesce((public.setting('orders.online_payment_minutes') #>> '{}')::int, 60)) end;
  end if;

  v_number := to_char(now() at time zone 'Europe/Prague', 'YY') || lpad(nextval('public.order_number_seq')::text, 8, '0');

  insert into public.orders (
    id, number, user_id, email, phone, market, currency, locale, status, payment_status,
    subtotal, discount_total, shipping_total, payment_fee_total, tax_total, grand_total, vat_breakdown,
    discount_id, discount_code_id, discount_code,
    shipping_method_id, shipping_method_name, shipping_carrier, shipping_type, pickup_point,
    payment_method_code, payment_method_name, payment_provider,
    customer_note, is_business, terms_accepted_at, terms_version, marketing_consent,
    idempotency_key, access_token_hash, ip_hash, reservation_expires_at)
  values (
    v_order_id, v_number, v_user, v_email, nullif(p ->> 'phone', ''), v_market,
    (v_quote ->> 'currency')::public.currency_code, coalesce(p ->> 'locale', 'cs'), v_status, 'pending',
    (v_quote ->> 'subtotal')::bigint, (v_quote ->> 'discount_total')::bigint, (v_quote ->> 'shipping_total')::bigint,
    (v_quote ->> 'payment_fee_total')::bigint, (v_quote ->> 'tax_total')::bigint, (v_quote ->> 'grand_total')::bigint,
    v_quote -> 'vat_breakdown',
    (v_disc ->> 'discount_id')::uuid, (v_disc ->> 'code_id')::uuid, v_disc ->> 'code',
    (v_ship ->> 'id')::uuid, v_ship ->> 'name', v_ship ->> 'carrier', (v_ship ->> 'type')::public.shipping_type,
    case when v_ship ->> 'type' = 'pickup_point' then p -> 'pickup_point' end,
    v_pay ->> 'code', v_pay ->> 'name', v_provider,
    nullif(left(p ->> 'customer_note', 1000), ''), coalesce((p ->> 'is_business')::boolean, false),
    now(), coalesce(p ->> 'terms_version', 'unknown'), coalesce((p ->> 'marketing_consent')::boolean, false),
    v_key, p ->> 'access_token_hash', p ->> 'ip_hash', v_expires);

  for v_line in select * from jsonb_array_elements(v_quote -> 'lines') loop
    insert into public.order_items (order_id, product_id, variant_id, sku, name, variant_name, image_url, quantity,
                                    unit_price, unit_compare_at, discount_amount, tax_rate_bps, tax_amount, line_total)
    values (v_order_id, (v_line ->> 'product_id')::uuid, (v_line ->> 'variant_id')::uuid, v_line ->> 'sku',
            v_line ->> 'name', v_line ->> 'variant_name', v_line ->> 'image', (v_line ->> 'quantity')::int,
            (v_line ->> 'unit_price')::bigint, (v_line ->> 'compare_at')::bigint, (v_line ->> 'discount_amount')::bigint,
            (v_line ->> 'tax_rate_bps')::int, (v_line ->> 'tax_amount')::bigint, (v_line ->> 'line_total')::bigint);

    -- Rezervace skladu: podmíněný UPDATE + CHECK constraint = žádné přeprodání
    update public.inventory
       set quantity_reserved = quantity_reserved + (v_line ->> 'quantity')::int
     where variant_id = (v_line ->> 'variant_id')::uuid
       and (allow_backorder or quantity_on_hand - quantity_reserved >= (v_line ->> 'quantity')::int);
    get diagnostics v_updated = row_count;
    if v_updated = 0 then
      raise exception 'OUT_OF_STOCK' using errcode = 'P0001', detail = v_line ->> 'item_id';
    end if;
    insert into public.inventory_movements (variant_id, reason, on_hand_delta, reserved_delta, on_hand_after, reserved_after, order_id, note)
    select i.variant_id, 'reservation', 0, (v_line ->> 'quantity')::int, i.quantity_on_hand, i.quantity_reserved, v_order_id,
           'Objednávka ' || v_number
      from public.inventory i where i.variant_id = (v_line ->> 'variant_id')::uuid;

    update public.products set sold_count = sold_count + (v_line ->> 'quantity')::int
     where id = (v_line ->> 'product_id')::uuid;
  end loop;

  insert into public.order_addresses (order_id, type, first_name, last_name, company, company_id, vat_id, street, city, postal_code, country, phone)
  values (v_order_id, 'billing', v_billing ->> 'first_name', v_billing ->> 'last_name', nullif(v_billing ->> 'company', ''),
          nullif(v_billing ->> 'company_id', ''), nullif(v_billing ->> 'vat_id', ''), v_billing ->> 'street',
          v_billing ->> 'city', v_billing ->> 'postal_code', coalesce(v_billing ->> 'country', v_market::text)::public.market_code,
          nullif(v_billing ->> 'phone', ''));
  if v_shipping_addr is not null and v_shipping_addr ->> 'street' is not null then
    insert into public.order_addresses (order_id, type, first_name, last_name, company, street, city, postal_code, country, phone)
    values (v_order_id, 'shipping', v_shipping_addr ->> 'first_name', v_shipping_addr ->> 'last_name',
            nullif(v_shipping_addr ->> 'company', ''), v_shipping_addr ->> 'street', v_shipping_addr ->> 'city',
            v_shipping_addr ->> 'postal_code', coalesce(v_shipping_addr ->> 'country', v_market::text)::public.market_code,
            nullif(v_shipping_addr ->> 'phone', ''));
  end if;

  if v_disc is not null then
    insert into public.discount_redemptions (discount_id, code_id, order_id, user_id, email, amount)
    values ((v_disc ->> 'discount_id')::uuid, (v_disc ->> 'code_id')::uuid, v_order_id, v_user, v_email,
            (v_quote ->> 'discount_total')::bigint);
  end if;

  insert into public.payments (order_id, provider, method_code, status, amount, currency)
  values (v_order_id, v_provider, v_pay ->> 'code', 'pending', (v_quote ->> 'grand_total')::bigint,
          (v_quote ->> 'currency')::public.currency_code)
  returning id into v_payment_id;

  insert into public.order_status_history (order_id, from_status, to_status, note)
  values (v_order_id, null, v_status, 'Objednávka přijata');

  update public.carts set status = 'converted' where id = v_cart.id;

  return jsonb_build_object('order_id', v_order_id, 'number', v_number, 'status', v_status,
    'grand_total', (v_quote ->> 'grand_total')::bigint, 'currency', v_quote ->> 'currency',
    'provider', v_provider, 'payment_id', v_payment_id, 'existing', false);
end $$;

-- -----------------------------------------------------------------------------
-- Stavový automat objednávky (+ vedlejší efekty na sklad a platbu)
-- -----------------------------------------------------------------------------
create or replace function public.order_transition(p_order_id uuid, p_to public.order_status, p_note text default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_order public.orders;
  v_uid uuid := (select auth.uid());
  v_allowed public.order_status[];
  v_item record;
  v_reserved_held boolean;
begin
  select * into v_order from public.orders where id = p_order_id for update;
  if not found then raise exception 'NOT_FOUND' using errcode = 'P0002'; end if;
  if v_order.status = p_to then
    return jsonb_build_object('changed', false, 'status', v_order.status);
  end if;

  v_allowed := case v_order.status
    when 'new' then array['processing', 'paid', 'ready_to_ship', 'shipped', 'cancelled']
    when 'awaiting_payment' then array['paid', 'cancelled']
    when 'paid' then array['processing', 'ready_to_ship', 'shipped', 'cancelled']
    when 'processing' then array['ready_to_ship', 'shipped', 'cancelled']
    when 'ready_to_ship' then array['processing', 'shipped', 'cancelled']
    when 'shipped' then array['delivered', 'returned']
    when 'delivered' then array['returned', 'complaint']
    when 'complaint' then array['delivered', 'returned']
    else array[]::text[] end::public.order_status[];
  if not (p_to = any(v_allowed)) then
    raise exception 'INVALID_TRANSITION' using errcode = 'P0001', detail = v_order.status || ' -> ' || p_to;
  end if;

  if v_uid is not null and coalesce(current_setting('color.system', true), '') <> 'on' then
    if p_to in ('processing', 'ready_to_ship', 'shipped', 'delivered') then
      if not (public.has_perm('orders.fulfill') or public.has_perm('orders.write')) then
        raise exception 'FORBIDDEN' using errcode = '42501';
      end if;
    elsif not public.has_perm('orders.write') then
      raise exception 'FORBIDDEN' using errcode = '42501';
    end if;
  end if;

  v_reserved_held := v_order.status not in ('shipped', 'delivered', 'returned', 'complaint', 'cancelled');

  if p_to = 'cancelled' then
    if v_reserved_held then
      for v_item in select * from public.order_items where order_id = v_order.id and variant_id is not null order by variant_id loop
        perform public.inventory_apply(v_item.variant_id, 0, -v_item.quantity, 'reservation_release', v_order.id,
                                       'Storno objednávky ' || v_order.number);
        update public.products set sold_count = greatest(sold_count - v_item.quantity, 0) where id = v_item.product_id;
      end loop;
    end if;
    if v_order.discount_id is not null then
      update public.discounts set times_used = greatest(times_used - 1, 0) where id = v_order.discount_id;
      update public.discount_codes set times_used = greatest(times_used - 1, 0) where id = v_order.discount_code_id;
      delete from public.discount_redemptions where order_id = v_order.id;
    end if;
    update public.payments set status = 'cancelled'
     where order_id = v_order.id and status in ('pending', 'authorized', 'failed', 'expired');
    update public.orders set status = 'cancelled', cancelled_at = now(), reservation_expires_at = null,
           payment_status = case when payment_status in ('pending', 'authorized', 'failed', 'expired') then 'cancelled' else payment_status end
     where id = v_order.id;
  elsif p_to = 'shipped' then
    for v_item in select * from public.order_items where order_id = v_order.id and variant_id is not null order by variant_id loop
      perform public.inventory_apply(v_item.variant_id, -v_item.quantity, -v_item.quantity, 'sale', v_order.id,
                                     'Expedice objednávky ' || v_order.number);
    end loop;
    update public.orders set status = 'shipped', shipped_at = now(), reservation_expires_at = null where id = v_order.id;
  elsif p_to = 'paid' then
    update public.payments set status = 'paid', paid_at = coalesce(paid_at, now())
     where id = (select id from public.payments where order_id = v_order.id order by created_at desc limit 1)
       and status <> 'paid';
    update public.orders set status = 'paid', payment_status = 'paid', paid_at = coalesce(paid_at, now()),
           reservation_expires_at = null
     where id = v_order.id;
  elsif p_to = 'delivered' then
    if v_order.payment_provider = 'cod' and v_order.payment_status = 'pending' then
      update public.payments set status = 'paid', paid_at = now() where order_id = v_order.id and status = 'pending';
      update public.orders set payment_status = 'paid', paid_at = now() where id = v_order.id;
    end if;
    update public.orders set status = 'delivered', delivered_at = now() where id = v_order.id;
  else
    update public.orders set status = p_to where id = v_order.id;
  end if;

  insert into public.order_status_history (order_id, from_status, to_status, actor_id, note)
  values (v_order.id, v_order.status, p_to, v_uid, left(p_note, 1000));

  return jsonb_build_object('changed', true, 'from', v_order.status, 'status', p_to,
                            'order_id', v_order.id, 'number', v_order.number, 'email', v_order.email, 'locale', v_order.locale);
end $$;

-- -----------------------------------------------------------------------------
-- Platby: idempotentní zpracování událostí z platebních bran (server-side ověřené)
-- -----------------------------------------------------------------------------
create or replace function public.payment_apply_event(
  p_provider public.payment_provider,
  p_event_id text,
  p_event_type text,
  p_payment_id uuid,
  p_provider_payment_id text,
  p_status public.payment_status,
  p_amount bigint,
  p_currency public.currency_code,
  p_payload jsonb default null
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_event_id bigint;
  v_payment public.payments;
  v_order public.orders;
  v_allowed public.payment_status[];
  v_result text;
  v_order_changed boolean := false;
begin
  insert into public.payment_events (provider, provider_event_id, event_type, status, amount, payload)
  values (p_provider, p_event_id, p_event_type, p_status, p_amount, p_payload)
  on conflict (provider, provider_event_id) do nothing
  returning id into v_event_id;
  if v_event_id is null then
    return jsonb_build_object('duplicate', true);
  end if;

  if p_payment_id is not null then
    select * into v_payment from public.payments where id = p_payment_id for update;
  else
    select * into v_payment from public.payments
     where provider = p_provider and provider_payment_id = p_provider_payment_id for update;
  end if;
  if not found then
    update public.payment_events set result = 'payment_not_found' where id = v_event_id;
    return jsonb_build_object('duplicate', false, 'result', 'payment_not_found');
  end if;
  update public.payment_events set payment_id = v_payment.id where id = v_event_id;

  if p_status in ('paid', 'authorized') and (p_amount is distinct from v_payment.amount or p_currency is distinct from v_payment.currency) then
    update public.payment_events set result = 'amount_mismatch' where id = v_event_id;
    perform public.notify_staff('payment_failed', 'Nesouhlasí částka platby',
      'Platba ' || v_payment.id || ': očekáváno ' || v_payment.amount || ', přijato ' || coalesce(p_amount::text, '?'),
      '/admin/objednavky/' || v_payment.order_id, 'orders.read', 'payment', v_payment.id::text);
    return jsonb_build_object('duplicate', false, 'result', 'amount_mismatch');
  end if;

  if v_payment.status = p_status then
    update public.payment_events set result = 'no_change' where id = v_event_id;
    return jsonb_build_object('duplicate', false, 'result', 'no_change', 'order_id', v_payment.order_id);
  end if;

  v_allowed := case v_payment.status
    when 'pending' then array['authorized', 'paid', 'failed', 'cancelled', 'expired']
    when 'authorized' then array['paid', 'failed', 'cancelled', 'expired']
    when 'failed' then array['pending', 'authorized', 'paid', 'cancelled', 'expired']
    when 'cancelled' then array['paid']
    when 'expired' then array['paid']
    when 'paid' then array['refunded', 'partially_refunded']
    when 'partially_refunded' then array['refunded', 'partially_refunded']
    else array[]::text[] end::public.payment_status[];
  if not (p_status = any(v_allowed)) then
    update public.payment_events set result = 'ignored_transition' where id = v_event_id;
    return jsonb_build_object('duplicate', false, 'result', 'ignored_transition', 'order_id', v_payment.order_id);
  end if;

  update public.payments
     set status = p_status,
         provider_payment_id = coalesce(provider_payment_id, p_provider_payment_id),
         paid_at = case when p_status = 'paid' then coalesce(paid_at, now()) else paid_at end,
         failure_reason = case when p_status in ('failed', 'cancelled', 'expired') then p_event_type else failure_reason end
   where id = v_payment.id;

  select * into v_order from public.orders where id = v_payment.order_id for update;
  if p_status = 'paid' then
    if v_order.status in ('awaiting_payment', 'new') then
      perform public.order_transition(v_order.id, 'paid', 'Platba přijata (' || p_provider || ')');
      v_order_changed := true;
    elsif v_order.status = 'cancelled' then
      update public.orders set payment_status = 'paid', paid_at = now() where id = v_order.id;
      perform public.notify_staff('payment_failed', 'Platba přišla ke zrušené objednávce ' || v_order.number,
        'Zkontrolujte, zda objednávku obnovit, nebo platbu vrátit.', '/admin/objednavky/' || v_order.id,
        'orders.read', 'order', v_order.id::text);
    else
      update public.orders set payment_status = 'paid', paid_at = coalesce(paid_at, now()) where id = v_order.id;
    end if;
  else
    update public.orders set payment_status = p_status where id = v_order.id;
  end if;

  v_result := 'applied';
  update public.payment_events set result = v_result where id = v_event_id;
  return jsonb_build_object('duplicate', false, 'result', v_result, 'order_id', v_order.id, 'number', v_order.number,
    'email', v_order.email, 'locale', v_order.locale, 'payment_status', p_status, 'order_paid', v_order_changed);
end $$;

-- Uložení ID platby u brány (po vytvoření platební session)
create or replace function public.payment_attach_provider(p_payment_id uuid, p_provider_payment_id text, p_redirect_url text)
returns void language sql security definer set search_path = '' as $$
  update public.payments
     set provider_payment_id = p_provider_payment_id, redirect_url = p_redirect_url
   where id = p_payment_id and status in ('pending', 'failed')
$$;

-- Automatické storno nezaplacených objednávek po vypršení rezervace (cron)
create or replace function public.expire_unpaid_orders(p_limit integer default 100)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_order record;
  v_out jsonb := '[]'::jsonb;
begin
  for v_order in
    select id, number, email, locale from public.orders
     where status = 'awaiting_payment' and reservation_expires_at < now()
     order by reservation_expires_at
     limit p_limit
     for update skip locked
  loop
    update public.payments set status = 'expired' where order_id = v_order.id and status in ('pending', 'failed');
    perform public.order_transition(v_order.id, 'cancelled', 'Automaticky zrušeno – platba nedorazila včas');
    v_out := v_out || jsonb_build_array(jsonb_build_object('order_id', v_order.id, 'number', v_order.number,
                                                          'email', v_order.email, 'locale', v_order.locale));
  end loop;
  return v_out;
end $$;

-- Refundace: záznam (idempotentní) a dokončení
create or replace function public.refund_create(p_payment_id uuid, p_amount bigint, p_reason text, p_idempotency_key text)
returns public.refunds language plpgsql security definer set search_path = '' as $$
declare
  v_payment public.payments;
  v_refund public.refunds;
  v_pending bigint;
begin
  if (select auth.uid()) is not null and not public.has_perm('payments.refund') then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;
  select * into v_refund from public.refunds where idempotency_key = p_idempotency_key;
  if found then return v_refund; end if;
  select * into v_payment from public.payments where id = p_payment_id for update;
  if not found then raise exception 'NOT_FOUND' using errcode = 'P0002'; end if;
  if v_payment.status not in ('paid', 'partially_refunded') then raise exception 'NOT_REFUNDABLE' using errcode = 'P0001'; end if;
  select coalesce(sum(amount), 0) into v_pending from public.refunds where payment_id = p_payment_id and status = 'pending';
  if p_amount <= 0 or p_amount > v_payment.amount - v_payment.refunded_amount - v_pending then
    raise exception 'REFUND_AMOUNT_INVALID' using errcode = 'P0001';
  end if;
  insert into public.refunds (payment_id, amount, reason, idempotency_key, created_by, status)
  values (p_payment_id, p_amount, left(p_reason, 500), p_idempotency_key, (select auth.uid()),
          case when v_payment.provider in ('bank_transfer', 'cod') then 'manual' else 'pending' end)
  returning * into v_refund;
  return v_refund;
end $$;

create or replace function public.refund_complete(p_refund_id uuid, p_succeeded boolean, p_provider_refund_id text)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_refund public.refunds;
  v_payment public.payments;
begin
  select * into v_refund from public.refunds where id = p_refund_id for update;
  if not found or v_refund.status in ('succeeded', 'failed') then return; end if;
  if (select auth.uid()) is not null and not public.has_perm('payments.refund') then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;
  update public.refunds set status = case when p_succeeded then 'succeeded' else 'failed' end,
         provider_refund_id = p_provider_refund_id where id = p_refund_id;
  if p_succeeded then
    update public.payments
       set refunded_amount = refunded_amount + v_refund.amount,
           status = case when refunded_amount + v_refund.amount >= amount then 'refunded' else 'partially_refunded' end
     where id = v_refund.payment_id
    returning * into v_payment;
    update public.orders set payment_status = v_payment.status where id = v_payment.order_id;
  end if;
end $$;

-- -----------------------------------------------------------------------------
-- Zásilky (administrace / integrace dopravců)
-- -----------------------------------------------------------------------------
create or replace function public.shipment_upsert(
  p_order_id uuid, p_shipment_id uuid, p_carrier text, p_tracking_number text, p_tracking_url text,
  p_status public.shipment_status, p_provider_shipment_id text default null, p_label_url text default null
) returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_id uuid;
  v_old public.shipment_status;
  v_order public.orders;
begin
  if (select auth.uid()) is not null and not (public.has_perm('orders.fulfill') or public.has_perm('orders.write')) then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;
  select * into v_order from public.orders where id = p_order_id;
  if not found then raise exception 'NOT_FOUND' using errcode = 'P0002'; end if;
  if p_shipment_id is null then
    insert into public.shipments (order_id, carrier, tracking_number, tracking_url, status, provider_shipment_id, label_url)
    values (p_order_id, p_carrier, nullif(p_tracking_number, ''), nullif(p_tracking_url, ''), p_status,
            p_provider_shipment_id, p_label_url)
    returning id into v_id;
  else
    select status into v_old from public.shipments where id = p_shipment_id and order_id = p_order_id for update;
    if not found then raise exception 'NOT_FOUND' using errcode = 'P0002'; end if;
    update public.shipments
       set carrier = p_carrier, tracking_number = nullif(p_tracking_number, ''), tracking_url = nullif(p_tracking_url, ''),
           status = p_status, provider_shipment_id = coalesce(p_provider_shipment_id, provider_shipment_id),
           label_url = coalesce(p_label_url, label_url),
           shipped_at = case when p_status in ('handed_over', 'in_transit') then coalesce(shipped_at, now()) else shipped_at end,
           delivered_at = case when p_status = 'delivered' then coalesce(delivered_at, now()) else delivered_at end
     where id = p_shipment_id
    returning id into v_id;
  end if;
  if v_old is distinct from p_status then
    insert into public.shipment_events (shipment_id, status) values (v_id, p_status);
  end if;
  if p_status in ('handed_over', 'in_transit', 'ready_for_pickup') and v_order.status in ('new', 'paid', 'processing', 'ready_to_ship') then
    perform public.order_transition(p_order_id, 'shipped', 'Zásilka předána dopravci');
  elsif p_status = 'delivered' and v_order.status = 'shipped' then
    perform public.order_transition(p_order_id, 'delivered', 'Zásilka doručena');
  end if;
  return v_id;
end $$;

-- -----------------------------------------------------------------------------
-- Zákaznické funkce
-- -----------------------------------------------------------------------------
-- Po přihlášení připojí dřívější objednávky bez registrace (jen s ověřeným e-mailem)
create or replace function public.link_guest_orders() returns integer
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := (select auth.uid());
  v_email text;
  v_count integer;
begin
  if v_uid is null then return 0; end if;
  select lower(email) into v_email from auth.users where id = v_uid and email_confirmed_at is not null;
  if v_email is null then return 0; end if;
  update public.orders set user_id = v_uid where user_id is null and lower(email) = v_email;
  get diagnostics v_count = row_count;
  return v_count;
end $$;

create or replace function public.create_return_request(
  p_order_id uuid, p_type public.return_type, p_items jsonb, p_reason text, p_bank_account text
) returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := (select auth.uid());
  v_order public.orders;
  v_item jsonb;
  v_id uuid;
begin
  select * into v_order from public.orders where id = p_order_id and user_id = v_uid;
  if not found then raise exception 'NOT_FOUND' using errcode = 'P0002'; end if;
  if v_order.status not in ('shipped', 'delivered', 'complaint') then
    raise exception 'RETURN_NOT_ALLOWED' using errcode = 'P0001';
  end if;
  if p_type = 'return' and v_order.delivered_at is not null and v_order.delivered_at < now() - interval '30 days' then
    raise exception 'RETURN_WINDOW_CLOSED' using errcode = 'P0001';
  end if;
  if exists (select 1 from public.return_requests where order_id = p_order_id and status in ('requested', 'approved', 'received')
              and type = p_type) then
    raise exception 'RETURN_ALREADY_OPEN' using errcode = 'P0001';
  end if;
  for v_item in select * from jsonb_array_elements(p_items) loop
    if not exists (select 1 from public.order_items oi where oi.id = (v_item ->> 'order_item_id')::uuid
                     and oi.order_id = p_order_id and (v_item ->> 'quantity')::int between 1 and oi.quantity) then
      raise exception 'RETURN_ITEM_INVALID' using errcode = 'P0001';
    end if;
  end loop;
  insert into public.return_requests (order_id, user_id, type, items, reason, bank_account)
  values (p_order_id, v_uid, p_type, p_items, left(p_reason, 2000), nullif(left(p_bank_account, 64), ''))
  returning id into v_id;
  return v_id;
end $$;

create or replace function public.return_set_status(p_id uuid, p_status public.return_status, p_note text, p_refund_amount bigint)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.has_perm('returns.manage') then raise exception 'FORBIDDEN' using errcode = '42501'; end if;
  update public.return_requests
     set status = p_status, staff_note = coalesce(nullif(left(p_note, 2000), ''), staff_note),
         refund_amount = coalesce(p_refund_amount, refund_amount)
   where id = p_id;
  if not found then raise exception 'NOT_FOUND' using errcode = 'P0002'; end if;
  perform public.log_admin_action('return.status', 'return_requests', p_id::text, jsonb_build_object('status', p_status));
end $$;
