-- =============================================================================
-- COLOR 0007 · Administrace: uložení produktu (transakčně), duplikace, dashboard,
-- globální hledání, zákazníci, CSV import s reportem chyb po řádcích
-- =============================================================================

create or replace function public.admin_save_product(p jsonb) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_id uuid := nullif(p ->> 'id', '')::uuid;
  v_v jsonb;
  v_vid uuid;
  v_market text;
  v_price jsonb;
  v_default uuid;
  v_attr jsonb;
  v_value text;
  v_img jsonb;
  v_rel jsonb;
  v_stock integer;
begin
  if not public.has_perm('catalog.write') then raise exception 'FORBIDDEN' using errcode = '42501'; end if;

  if v_id is null then
    insert into public.products (slug, name, subtitle, brand_id, primary_category_id, short_description, description,
      package_contents, tax_class, badge, is_active, is_featured, video_url, weight_grams, length_mm, width_mm, height_mm,
      warranty_months, seo_title, seo_description, translations)
    values (p ->> 'slug', p ->> 'name', nullif(p ->> 'subtitle', ''), nullif(p ->> 'brand_id', '')::uuid,
      nullif(p ->> 'primary_category_id', '')::uuid, nullif(p ->> 'short_description', ''), nullif(p ->> 'description', ''),
      nullif(p ->> 'package_contents', ''), coalesce(nullif(p ->> 'tax_class', ''), 'standard'), nullif(p ->> 'badge', ''),
      coalesce((p ->> 'is_active')::boolean, false), coalesce((p ->> 'is_featured')::boolean, false),
      nullif(p ->> 'video_url', ''), (p ->> 'weight_grams')::int, (p ->> 'length_mm')::int, (p ->> 'width_mm')::int,
      (p ->> 'height_mm')::int, (p ->> 'warranty_months')::int, nullif(p ->> 'seo_title', ''),
      nullif(p ->> 'seo_description', ''), coalesce(p -> 'translations', '{}'::jsonb))
    returning id into v_id;
  else
    update public.products set
      slug = p ->> 'slug', name = p ->> 'name', subtitle = nullif(p ->> 'subtitle', ''),
      brand_id = nullif(p ->> 'brand_id', '')::uuid, primary_category_id = nullif(p ->> 'primary_category_id', '')::uuid,
      short_description = nullif(p ->> 'short_description', ''), description = nullif(p ->> 'description', ''),
      package_contents = nullif(p ->> 'package_contents', ''), tax_class = coalesce(nullif(p ->> 'tax_class', ''), 'standard'),
      badge = nullif(p ->> 'badge', ''), is_active = coalesce((p ->> 'is_active')::boolean, false),
      is_featured = coalesce((p ->> 'is_featured')::boolean, false), video_url = nullif(p ->> 'video_url', ''),
      weight_grams = (p ->> 'weight_grams')::int, length_mm = (p ->> 'length_mm')::int, width_mm = (p ->> 'width_mm')::int,
      height_mm = (p ->> 'height_mm')::int, warranty_months = (p ->> 'warranty_months')::int,
      seo_title = nullif(p ->> 'seo_title', ''), seo_description = nullif(p ->> 'seo_description', ''),
      translations = coalesce(p -> 'translations', '{}'::jsonb)
    where id = v_id;
    if not found then raise exception 'NOT_FOUND' using errcode = 'P0002'; end if;
  end if;

  -- Kategorie
  delete from public.product_categories where product_id = v_id
     and category_id not in (select (jsonb_array_elements_text(coalesce(p -> 'category_ids', '[]'::jsonb)))::uuid);
  insert into public.product_categories (product_id, category_id)
  select v_id, (c)::uuid from jsonb_array_elements_text(coalesce(p -> 'category_ids', '[]'::jsonb)) c
  on conflict do nothing;
  if nullif(p ->> 'primary_category_id', '') is not null then
    insert into public.product_categories (product_id, category_id) values (v_id, (p ->> 'primary_category_id')::uuid)
    on conflict do nothing;
  end if;

  -- Obrázky (nahrávají se samostatně; zde pořadí, alt a mazání)
  delete from public.product_images where product_id = v_id
     and id in (select (jsonb_array_elements_text(coalesce(p -> 'deleted_image_ids', '[]'::jsonb)))::uuid);
  for v_img in select * from jsonb_array_elements(coalesce(p -> 'images', '[]'::jsonb)) loop
    update public.product_images set alt = nullif(v_img ->> 'alt', ''), sort_order = coalesce((v_img ->> 'sort_order')::int, 0)
     where id = (v_img ->> 'id')::uuid and product_id = v_id;
  end loop;

  -- Varianty, ceny, skladová nastavení
  delete from public.product_variants where product_id = v_id
     and id in (select (jsonb_array_elements_text(coalesce(p -> 'deleted_variant_ids', '[]'::jsonb)))::uuid);
  update public.product_variants set is_default = false where product_id = v_id and is_default;
  for v_v in select * from jsonb_array_elements(coalesce(p -> 'variants', '[]'::jsonb)) loop
    v_vid := nullif(v_v ->> 'id', '')::uuid;
    if v_vid is null then
      insert into public.product_variants (product_id, sku, ean, name, options, image_id, weight_grams, is_active, sort_order)
      values (v_id, v_v ->> 'sku', nullif(v_v ->> 'ean', ''), nullif(v_v ->> 'name', ''), coalesce(v_v -> 'options', '{}'::jsonb),
              nullif(v_v ->> 'image_id', '')::uuid, (v_v ->> 'weight_grams')::int, coalesce((v_v ->> 'is_active')::boolean, true),
              coalesce((v_v ->> 'sort_order')::int, 0))
      returning id into v_vid;
      v_stock := coalesce((v_v ->> 'initial_stock')::int, 0);
      if v_stock > 0 then
        perform public.inventory_apply(v_vid, v_stock, 0, 'initial', null, 'Počáteční stav');
      end if;
    else
      update public.product_variants set sku = v_v ->> 'sku', ean = nullif(v_v ->> 'ean', ''), name = nullif(v_v ->> 'name', ''),
             options = coalesce(v_v -> 'options', '{}'::jsonb), image_id = nullif(v_v ->> 'image_id', '')::uuid,
             weight_grams = (v_v ->> 'weight_grams')::int, is_active = coalesce((v_v ->> 'is_active')::boolean, true),
             sort_order = coalesce((v_v ->> 'sort_order')::int, 0)
       where id = v_vid and product_id = v_id;
      if not found then raise exception 'VARIANT_NOT_FOUND' using errcode = 'P0002'; end if;
    end if;
    if coalesce((v_v ->> 'is_default')::boolean, false) and v_default is null then v_default := v_vid; end if;

    for v_market in select unnest(array['CZ', 'SK']) loop
      v_price := v_v -> 'prices' -> v_market;
      if v_price is null or nullif(v_price ->> 'price', '') is null then
        delete from public.product_prices where variant_id = v_vid and market = v_market::public.market_code;
      else
        insert into public.product_prices (variant_id, market, price, compare_at_price)
        values (v_vid, v_market::public.market_code, (v_price ->> 'price')::bigint, nullif(v_price ->> 'compare_at', '')::bigint)
        on conflict (variant_id, market) do update
          set price = excluded.price, compare_at_price = excluded.compare_at_price;
      end if;
    end loop;

    update public.inventory set
      low_stock_threshold = coalesce((v_v ->> 'low_stock_threshold')::int, low_stock_threshold),
      allow_backorder = coalesce((v_v ->> 'allow_backorder')::boolean, allow_backorder)
     where variant_id = v_vid;
  end loop;
  if v_default is null then
    select id into v_default from public.product_variants where product_id = v_id order by sort_order, created_at limit 1;
  end if;
  update public.product_variants set is_default = true where id = v_default;

  -- Parametry
  if p ? 'attributes' then
    delete from public.product_attribute_values where product_id = v_id;
    for v_attr in select * from jsonb_array_elements(p -> 'attributes') loop
      for v_value in select jsonb_array_elements_text(coalesce(v_attr -> 'value_ids', '[]'::jsonb)) loop
        insert into public.product_attribute_values (product_id, attribute_id, value_id)
        values (v_id, (v_attr ->> 'attribute_id')::uuid, v_value::uuid) on conflict do nothing;
      end loop;
      if nullif(v_attr ->> 'value_number', '') is not null then
        insert into public.product_attribute_values (product_id, attribute_id, value_number)
        values (v_id, (v_attr ->> 'attribute_id')::uuid, (v_attr ->> 'value_number')::numeric);
      elsif nullif(v_attr ->> 'value_text', '') is not null then
        insert into public.product_attribute_values (product_id, attribute_id, value_text)
        values (v_id, (v_attr ->> 'attribute_id')::uuid, v_attr ->> 'value_text');
      elsif v_attr ? 'value_boolean' and jsonb_typeof(v_attr -> 'value_boolean') = 'boolean' then
        insert into public.product_attribute_values (product_id, attribute_id, value_boolean)
        values (v_id, (v_attr ->> 'attribute_id')::uuid, (v_attr ->> 'value_boolean')::boolean);
      end if;
    end loop;
  end if;

  -- Vazby (související, upsell, cross-sell, příslušenství, alternativy)
  if p ? 'relations' then
    delete from public.product_relations where product_id = v_id;
    for v_rel in select * from jsonb_array_elements(p -> 'relations') loop
      if (v_rel ->> 'related_product_id')::uuid <> v_id then
        insert into public.product_relations (product_id, related_product_id, relation, sort_order)
        values (v_id, (v_rel ->> 'related_product_id')::uuid, v_rel ->> 'relation', coalesce((v_rel ->> 'sort_order')::int, 0))
        on conflict do nothing;
      end if;
    end loop;
  end if;

  return v_id;
exception
  when unique_violation then
    raise exception 'DUPLICATE_VALUE' using errcode = '23505', detail = sqlerrm;
end $$;

create or replace function public.admin_duplicate_product(p_id uuid) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_src public.products;
  v_new uuid;
  v_suffix text := lower(substr(md5(random()::text), 1, 4));
  v_var record;
  v_new_var uuid;
  v_img_map jsonb := '{}'::jsonb;
  v_img record;
  v_new_img uuid;
begin
  if not public.has_perm('catalog.write') then raise exception 'FORBIDDEN' using errcode = '42501'; end if;
  select * into v_src from public.products where id = p_id;
  if not found then raise exception 'NOT_FOUND' using errcode = 'P0002'; end if;

  insert into public.products (slug, name, subtitle, brand_id, primary_category_id, short_description, description,
    package_contents, tax_class, badge, is_active, is_featured, video_url, weight_grams, length_mm, width_mm, height_mm,
    warranty_months, seo_title, seo_description, translations)
  values (left(v_src.slug, 180) || '-kopie-' || v_suffix, left(v_src.name || ' (kopie)', 200), v_src.subtitle, v_src.brand_id,
    v_src.primary_category_id, v_src.short_description, v_src.description, v_src.package_contents, v_src.tax_class,
    v_src.badge, false, false, v_src.video_url, v_src.weight_grams, v_src.length_mm, v_src.width_mm, v_src.height_mm,
    v_src.warranty_months, v_src.seo_title, v_src.seo_description, v_src.translations)
  returning id into v_new;

  for v_img in select * from public.product_images where product_id = p_id order by sort_order loop
    insert into public.product_images (product_id, url, storage_path, alt, width, height, sort_order)
    values (v_new, v_img.url, v_img.storage_path, v_img.alt, v_img.width, v_img.height, v_img.sort_order)
    returning id into v_new_img;
    v_img_map := v_img_map || jsonb_build_object(v_img.id::text, v_new_img);
  end loop;

  for v_var in select * from public.product_variants where product_id = p_id order by sort_order loop
    insert into public.product_variants (product_id, sku, name, options, image_id, weight_grams, is_default, is_active, sort_order)
    values (v_new, left(v_var.sku, 56) || '-K' || upper(v_suffix), v_var.name, v_var.options,
            (v_img_map ->> v_var.image_id::text)::uuid, v_var.weight_grams, v_var.is_default, v_var.is_active, v_var.sort_order)
    returning id into v_new_var;
    insert into public.product_prices (variant_id, market, price, compare_at_price)
    select v_new_var, market, price, compare_at_price from public.product_prices where variant_id = v_var.id;
  end loop;

  insert into public.product_categories (product_id, category_id)
  select v_new, category_id from public.product_categories where product_id = p_id;
  insert into public.product_attribute_values (product_id, attribute_id, value_id, value_number, value_text, value_boolean)
  select v_new, attribute_id, value_id, value_number, value_text, value_boolean from public.product_attribute_values where product_id = p_id;
  insert into public.product_relations (product_id, related_product_id, relation, sort_order)
  select v_new, related_product_id, relation, sort_order from public.product_relations where product_id = p_id;

  perform public.log_admin_action('product.duplicate', 'products', v_new::text, jsonb_build_object('source', p_id));
  return v_new;
end $$;

-- Přehled pro dashboard (obrat v měně zvoleného trhu, bez stornovaných objednávek)
create or replace function public.admin_dashboard(p_market public.market_code, p_days integer default 30)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  v_from timestamptz := date_trunc('day', now() at time zone 'Europe/Prague') at time zone 'Europe/Prague'
                        - make_interval(days => greatest(p_days, 1) - 1);
  v_prev_from timestamptz := v_from - make_interval(days => greatest(p_days, 1));
  v_result jsonb;
begin
  if not (public.has_perm('analytics.read') or public.has_perm('orders.read')) then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;
  with o as (
    select * from public.orders where market = p_market and created_at >= v_prev_from
  ),
  cur as (select * from o where created_at >= v_from),
  prev as (select * from o where created_at < v_from),
  valid_cur as (select * from cur where status not in ('cancelled')),
  valid_prev as (select * from prev where status not in ('cancelled'))
  select jsonb_build_object(
    'currency', (select currency from public.markets where code = p_market),
    'from', v_from,
    'kpi', jsonb_build_object(
      'revenue', (select coalesce(sum(grand_total), 0) from valid_cur),
      'revenue_prev', (select coalesce(sum(grand_total), 0) from valid_prev),
      'orders', (select count(*) from valid_cur),
      'orders_prev', (select count(*) from valid_prev),
      'paid_orders', (select count(*) from valid_cur where payment_status in ('paid', 'partially_refunded')),
      'open_orders', (select count(*) from public.orders where market = p_market and status in ('new', 'awaiting_payment', 'paid', 'processing', 'ready_to_ship')),
      'awaiting_payment', (select count(*) from public.orders where market = p_market and status = 'awaiting_payment'),
      'avg_order_value', (select coalesce(round(avg(grand_total))::bigint, 0) from valid_cur),
      'customers_total', (select count(*) from public.profiles where role = 'customer'),
      'customers_new', (select count(*) from public.profiles where role = 'customer' and created_at >= v_from),
      'cancelled', (select count(*) from cur where status = 'cancelled')),
    'series', (select coalesce(jsonb_agg(jsonb_build_object('day', d.day, 'revenue', coalesce(x.revenue, 0), 'orders', coalesce(x.cnt, 0)) order by d.day), '[]'::jsonb)
                 from (select generate_series((v_from at time zone 'Europe/Prague')::date,
                                              (now() at time zone 'Europe/Prague')::date, interval '1 day')::date as day) d
                 left join (select (created_at at time zone 'Europe/Prague')::date as day, sum(grand_total) as revenue, count(*) as cnt
                              from valid_cur group by 1) x on x.day = d.day),
    'top_products', (select coalesce(jsonb_agg(t order by t.revenue desc), '[]'::jsonb) from (
                       select oi.product_id, max(oi.name) as name, sum(oi.quantity)::int as quantity, sum(oi.line_total) as revenue
                         from public.order_items oi join valid_cur vc on vc.id = oi.order_id
                        group by oi.product_id order by revenue desc limit 5) t),
    'top_categories', (select coalesce(jsonb_agg(t order by t.revenue desc), '[]'::jsonb) from (
                         select split_part(c.path, '/', 1) as root, max(rc.name) as name, sum(oi.line_total) as revenue
                           from public.order_items oi
                           join valid_cur vc on vc.id = oi.order_id
                           join public.products p on p.id = oi.product_id
                           join public.categories c on c.id = p.primary_category_id
                           join public.categories rc on rc.path = split_part(c.path, '/', 1)
                          group by 1 order by revenue desc limit 5) t),
    'low_stock', (select coalesce(jsonb_agg(t), '[]'::jsonb) from (
                    select v.id as variant_id, v.sku, p.name || coalesce(' – ' || v.name, '') as name, p.id as product_id,
                           i.quantity_on_hand - i.quantity_reserved as available, i.low_stock_threshold as threshold
                      from public.inventory i
                      join public.product_variants v on v.id = i.variant_id and v.is_active
                      join public.products p on p.id = v.product_id and p.is_active
                     where not i.allow_backorder and i.quantity_on_hand - i.quantity_reserved <= i.low_stock_threshold
                     order by i.quantity_on_hand - i.quantity_reserved, p.name limit 8) t),
    'recent_orders', (select coalesce(jsonb_agg(t order by t.created_at desc), '[]'::jsonb) from (
                        select id, number, email, status, payment_status, grand_total, currency, created_at
                          from public.orders where market = p_market order by created_at desc limit 8) t)
  ) into v_result;
  return v_result;
end $$;

-- Globální hledání v administraci (sekce podle oprávnění)
create or replace function public.admin_search(p_query text) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  v_raw text := btrim(left(coalesce(p_query, ''), 100));
  v_q text := public.search_normalize(v_raw);
  v_result jsonb := '{}'::jsonb;
begin
  if char_length(v_raw) < 2 then return jsonb_build_object('orders', '[]'::jsonb, 'customers', '[]'::jsonb, 'products', '[]'::jsonb); end if;
  if public.has_perm('orders.read') then
    v_result := v_result || jsonb_build_object('orders', coalesce((select jsonb_agg(t) from (
      select distinct o.id, o.number, o.email, o.status, o.grand_total, o.currency, o.created_at
        from public.orders o
        left join public.shipments s on s.order_id = o.id
       where o.number like v_raw || '%' or lower(o.email) like '%' || lower(v_raw) || '%' or s.tracking_number = v_raw
       order by o.created_at desc limit 8) t), '[]'::jsonb));
  end if;
  if public.has_perm('customers.read') then
    v_result := v_result || jsonb_build_object('customers', coalesce((select jsonb_agg(t) from (
      select p.id, p.email, p.first_name, p.last_name, p.role
        from public.profiles p
       where public.search_normalize(coalesce(p.first_name, '') || ' ' || coalesce(p.last_name, '') || ' ' || p.email) like '%' || v_q || '%'
       order by p.created_at desc limit 8) t), '[]'::jsonb));
  end if;
  if public.has_perm('catalog.read') then
    v_result := v_result || jsonb_build_object('products', coalesce((select jsonb_agg(t) from (
      select distinct on (p.id) p.id, p.name, p.slug, p.is_active, v.sku, v.ean
        from public.products p
        join public.product_variants v on v.product_id = p.id
       where p.search_text like '%' || v_q || '%' or upper(v.sku) like upper(v_raw) || '%' or v.ean = v_raw
       order by p.id, (upper(v.sku) = upper(v_raw)) desc limit 8) t), '[]'::jsonb));
  end if;
  return v_result;
end $$;

-- Seznam zákazníků s hodnotou (součet zaplacených objednávek po měnách)
create or replace function public.admin_customers(p_query text, p_page integer default 1, p_per_page integer default 30)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  v_q text := public.search_normalize(coalesce(p_query, ''));
  v_per integer := least(greatest(p_per_page, 1), 100);
  v_page integer := greatest(p_page, 1);
  v_result jsonb;
begin
  if not public.has_perm('customers.read') then raise exception 'FORBIDDEN' using errcode = '42501'; end if;
  with c as (
    select p.*, count(*) over () as total
      from public.profiles p
     where v_q = '' or public.search_normalize(coalesce(p.first_name, '') || ' ' || coalesce(p.last_name, '') || ' ' || p.email) like '%' || v_q || '%'
     order by p.created_at desc
     limit v_per offset (v_page - 1) * v_per
  )
  select jsonb_build_object(
    'total', coalesce((select max(total) from c), 0),
    'items', coalesce((select jsonb_agg(jsonb_build_object(
        'id', c.id, 'email', c.email, 'first_name', c.first_name, 'last_name', c.last_name, 'role', c.role,
        'is_blocked', c.is_blocked, 'created_at', c.created_at,
        'orders', (select count(*) from public.orders o where o.user_id = c.id),
        'spent_czk', (select coalesce(sum(grand_total), 0) from public.orders o where o.user_id = c.id and o.currency = 'CZK' and o.payment_status in ('paid', 'partially_refunded')),
        'spent_eur', (select coalesce(sum(grand_total), 0) from public.orders o where o.user_id = c.id and o.currency = 'EUR' and o.payment_status in ('paid', 'partially_refunded')),
        'newsletter', (select n.status from public.newsletter_subscribers n where lower(n.email) = c.email limit 1),
        'last_order_at', (select max(created_at) from public.orders o where o.user_id = c.id)) order by c.created_at desc) from c), '[]'::jsonb)
  ) into v_result;
  return v_result;
end $$;

-- CSV import produktů: každý řádek ve vlastní subtransakci, chyby do reportu
create or replace function public.admin_import_products(p_rows jsonb, p_filename text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_job uuid;
  v_row jsonb;
  v_n integer := 0;
  v_created integer := 0;
  v_updated integer := 0;
  v_errors jsonb := '[]'::jsonb;
  v_variant public.product_variants;
  v_product_id uuid;
  v_brand_id uuid;
  v_category_id uuid;
  v_slug text;
  v_stock integer;
  v_inv public.inventory;
begin
  if not (public.has_perm('import.run') and public.has_perm('catalog.write')) then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;
  if jsonb_typeof(p_rows) <> 'array' or jsonb_array_length(p_rows) > 5000 then
    raise exception 'IMPORT_TOO_LARGE' using errcode = '22023';
  end if;
  insert into public.import_jobs (filename, total_rows, created_by)
  values (left(p_filename, 200), jsonb_array_length(p_rows), (select auth.uid())) returning id into v_job;

  for v_row in select * from jsonb_array_elements(p_rows) loop
    v_n := v_n + 1;
    begin
      if coalesce(v_row ->> 'sku', '') !~ '^[A-Za-z0-9._/-]{2,64}$' then raise exception 'Neplatné SKU'; end if;
      if char_length(coalesce(v_row ->> 'name', '')) < 2 then raise exception 'Chybí název'; end if;
      if coalesce(v_row ->> 'price_czk', '') !~ '^[0-9]+$' then raise exception 'Neplatná cena CZK'; end if;
      if nullif(v_row ->> 'ean', '') is not null and (v_row ->> 'ean') !~ '^[0-9]{8,14}$' then raise exception 'Neplatný EAN'; end if;

      v_brand_id := null;
      if nullif(btrim(v_row ->> 'brand'), '') is not null then
        select id into v_brand_id from public.brands where lower(name) = lower(btrim(v_row ->> 'brand'));
        if v_brand_id is null then
          insert into public.brands (slug, name) values (public.slugify(v_row ->> 'brand'), btrim(v_row ->> 'brand'))
          on conflict (slug) do update set name = public.brands.name
          returning id into v_brand_id;
        end if;
      end if;
      v_category_id := null;
      if nullif(v_row ->> 'category_path', '') is not null then
        select id into v_category_id from public.categories where path = btrim(v_row ->> 'category_path', '/ ');
        if v_category_id is null then raise exception 'Kategorie % neexistuje', v_row ->> 'category_path'; end if;
      end if;

      select * into v_variant from public.product_variants where sku = v_row ->> 'sku';
      if found then
        v_product_id := v_variant.product_id;
        update public.products set name = v_row ->> 'name',
               description = coalesce(nullif(v_row ->> 'description', ''), description),
               brand_id = coalesce(v_brand_id, brand_id),
               primary_category_id = coalesce(v_category_id, primary_category_id)
         where id = v_product_id;
        if nullif(v_row ->> 'ean', '') is not null then
          update public.product_variants set ean = v_row ->> 'ean' where id = v_variant.id;
        end if;
        v_updated := v_updated + 1;
      else
        v_slug := public.slugify(v_row ->> 'name');
        if exists (select 1 from public.products where slug = v_slug) then
          v_slug := left(v_slug, 180) || '-' || lower(public.slugify(v_row ->> 'sku'));
        end if;
        insert into public.products (slug, name, description, brand_id, primary_category_id, is_active)
        values (v_slug, v_row ->> 'name', nullif(v_row ->> 'description', ''), v_brand_id, v_category_id, false)
        returning id into v_product_id;
        insert into public.product_variants (product_id, sku, ean, is_default)
        values (v_product_id, v_row ->> 'sku', nullif(v_row ->> 'ean', ''), true)
        returning * into v_variant;
        v_created := v_created + 1;
      end if;
      if v_category_id is not null then
        insert into public.product_categories (product_id, category_id) values (v_product_id, v_category_id) on conflict do nothing;
      end if;

      insert into public.product_prices (variant_id, market, price)
      values (v_variant.id, 'CZ', (v_row ->> 'price_czk')::bigint * 100)
      on conflict (variant_id, market) do update set price = excluded.price;
      if coalesce(v_row ->> 'price_eur', '') ~ '^[0-9]+([.,][0-9]{1,2})?$' then
        insert into public.product_prices (variant_id, market, price)
        values (v_variant.id, 'SK', round(replace(v_row ->> 'price_eur', ',', '.')::numeric * 100)::bigint)
        on conflict (variant_id, market) do update set price = excluded.price;
      end if;

      if coalesce(v_row ->> 'stock', '') ~ '^[0-9]+$' then
        v_stock := (v_row ->> 'stock')::int;
        select * into v_inv from public.inventory where variant_id = v_variant.id for update;
        if v_stock < v_inv.quantity_reserved and not v_inv.allow_backorder then
          raise exception 'Sklad % je nižší než rezervace %', v_stock, v_inv.quantity_reserved;
        end if;
        if v_stock <> v_inv.quantity_on_hand then
          perform public.inventory_apply(v_variant.id, v_stock - v_inv.quantity_on_hand, 0, 'import', null, 'CSV import ' || left(p_filename, 80));
        end if;
      end if;
    exception when others then
      v_errors := v_errors || jsonb_build_array(jsonb_build_object('row', v_n, 'sku', v_row ->> 'sku', 'error', sqlerrm));
    end;
  end loop;

  update public.import_jobs set status = 'completed', created_rows = v_created, updated_rows = v_updated,
         error_rows = jsonb_array_length(v_errors), errors = v_errors, finished_at = now()
   where id = v_job;
  perform public.notify_staff('import_done', 'Import produktů dokončen',
    v_created || ' nových, ' || v_updated || ' aktualizovaných, ' || jsonb_array_length(v_errors) || ' chyb',
    '/admin/import', 'import.run', 'import', v_job::text);
  return jsonb_build_object('job_id', v_job, 'total', v_n, 'created', v_created, 'updated', v_updated, 'errors', v_errors);
end $$;

-- Počet nepřečtených notifikací pro aktuálního pracovníka
create or replace function public.admin_unread_notifications() returns integer
language sql stable security definer set search_path = '' as $$
  select count(*)::int from public.notifications n
   where public.has_perm(n.permission)
     and n.created_at > now() - interval '30 days'
     and not exists (select 1 from public.notification_reads r where r.notification_id = n.id and r.user_id = (select auth.uid()))
$$;

create or replace function public.admin_mark_notifications_read(p_ids uuid[]) returns void
language sql security definer set search_path = '' as $$
  insert into public.notification_reads (notification_id, user_id)
  select n.id, (select auth.uid()) from public.notifications n
   where (p_ids is null or n.id = any(p_ids)) and public.has_perm(n.permission)
  on conflict do nothing
$$;
