-- Historie objednávek (posledních 30 dní) pro dashboard, ověřené nákupy a recenze
do $$
declare
  v_fixed jsonb := '[
    ["martina@example.cz", ["color-pro-outdoor"]],
    ["peter@example.sk", ["color-protan"]],
    ["tomas@example.cz", ["color-deutan"]],
    ["jana@example.cz", ["color-pro-outdoor"]],
    ["lukas@example.cz", ["color-sport", "color-clip-on"]],
    ["katarina@example.sk", ["color-kids"]],
    ["michal@example.cz", ["color-indoor"]],
    ["eva@example.cz", ["color-tritan", "color-clip-on"]],
    ["martina@example.cz", ["color-kids"]],
    ["tomas@example.cz", ["color-sport"]]]';
  v_emails text[] := array['martina@example.cz', 'peter@example.sk', 'tomas@example.cz', 'jana@example.cz', 'lukas@example.cz',
                           'katarina@example.sk', 'michal@example.cz', 'eva@example.cz'];
  v_prof public.profiles;
  v_addr public.addresses;
  v_market public.market_code;
  v_currency public.currency_code;
  v_created timestamptz;
  v_days numeric;
  v_status public.order_status;
  v_pay_status public.payment_status;
  v_provider public.payment_provider;
  v_pay_code text;
  v_pay_name text;
  v_ship public.shipping_methods;
  v_ship_price bigint;
  v_fee bigint;
  v_subtotal bigint;
  v_tax bigint;
  v_rate integer;
  v_order uuid;
  v_number text;
  v_slugs text[];
  v_slug text;
  v_qty integer;
  v_var record;
  v_line bigint;
  v_line_tax bigint;
  v_r numeric;
  v_open boolean;
  v_shipment uuid;
begin
  perform setseed(0.42);
  for i in 1..46 loop
    if i <= jsonb_array_length(v_fixed) then
      select * into v_prof from public.profiles where email = v_fixed -> (i - 1) ->> 0;
      v_slugs := array(select jsonb_array_elements_text(v_fixed -> (i - 1) -> 1));
      v_days := 12 + random() * 17;
    else
      v_slug := v_emails[1 + floor(random() * array_length(v_emails, 1))::int];
      select * into v_prof from public.profiles where email = v_slug;
      -- Náhodné objednávky: nejčastěji bestsellery z návrhu
      v_slug := (array['color-pro-outdoor', 'color-protan', 'color-pro-outdoor', 'color-deutan',
                       'color-sport', null, 'color-clip-on', null])[1 + floor(random() * 8)::int];
      v_slugs := array(select slug from public.products
                        where is_active and slug not in ('color-pro-outdoor', 'color-protan', coalesce(v_slug, ''))
                        order by random() limit case when v_slug is null then 1 else floor(random() * 1.15)::int end);
      if v_slug is not null then v_slugs := array_prepend(v_slug, v_slugs); end if;
      v_days := case when i >= 40 then (46 - i) * 0.45 + random() * 0.1 else 2.5 + random() * 27 end;
    end if;
    select * into v_addr from public.addresses where user_id = v_prof.id and is_default_billing;
    v_market := case when v_prof.email like '%.sk' then 'SK' else 'CZ' end;
    v_currency := case v_market when 'SK' then 'EUR' else 'CZK' end;
    v_created := now() - v_days * interval '1 day';
    select rate_bps into v_rate from public.tax_rates where tax_class = 'standard' and market = v_market;

    v_r := random();
    v_provider := case when v_r < 0.55 then 'comgate' when v_r < 0.8 then 'bank_transfer' else 'cod' end;
    v_pay_code := case v_provider when 'comgate' then 'card' when 'bank_transfer' then 'bank_transfer' else 'cod' end;
    v_pay_name := case v_provider when 'comgate' then 'Online kartou, Apple Pay nebo Google Pay'
                                  when 'bank_transfer' then 'Bankovním převodem' else 'Na dobírku' end;

    if i in (23, 37) then
      v_status := 'cancelled';
    elsif v_days > 5 then v_status := 'delivered';
    elsif v_days > 2 then v_status := 'shipped';
    elsif v_days > 1 then v_status := case when random() < 0.5 then 'processing' else 'ready_to_ship' end;
    elsif v_provider = 'bank_transfer' then v_status := 'awaiting_payment';
    elsif v_provider = 'cod' then v_status := 'new';
    else v_status := 'paid';
    end if;
    v_pay_status := case
      when v_status = 'cancelled' then 'cancelled'
      when v_status = 'awaiting_payment' then 'pending'
      when v_provider = 'cod' and v_status <> 'delivered' then 'pending'
      else 'paid' end;
    v_open := v_status in ('new', 'awaiting_payment', 'paid', 'processing', 'ready_to_ship');

    v_slug := case when random() < 0.6 then 'packeta_pickup' when v_market = 'SK' then 'sps' else 'ppl' end;
    select * into v_ship from public.shipping_methods where code = v_slug;

    v_order := gen_random_uuid();
    v_number := to_char(v_created at time zone 'Europe/Prague', 'YY') || lpad(nextval('public.order_number_seq')::text, 8, '0');
    v_subtotal := 0;
    v_tax := 0;

    insert into public.orders (id, number, user_id, email, phone, market, currency, locale, status, payment_status,
      subtotal, discount_total, shipping_total, payment_fee_total, tax_total, grand_total,
      shipping_method_id, shipping_method_name, shipping_carrier, shipping_type, pickup_point,
      payment_method_code, payment_method_name, payment_provider, terms_accepted_at, terms_version,
      idempotency_key, access_token_hash, created_at, updated_at, paid_at, shipped_at, delivered_at, cancelled_at,
      reservation_expires_at)
    values (v_order, v_number, v_prof.id, v_prof.email, v_addr.phone, v_market, v_currency,
      case v_market when 'SK' then 'sk' else 'cs' end, v_status, v_pay_status,
      0, 0, 0, 0, 0, 0,
      v_ship.id, v_ship.name, v_ship.carrier, v_ship.type,
      case when v_ship.type = 'pickup_point' then jsonb_build_object('id', '1234', 'name', 'Z-BOX ' || v_addr.city, 'street', v_addr.street, 'city', v_addr.city, 'zip', v_addr.postal_code, 'carrier', 'packeta') end,
      v_pay_code, v_pay_name, v_provider, v_created, '2026-09-26',
      'seed-' || gen_random_uuid(), md5(random()::text) || md5(random()::text), v_created, v_created,
      case when v_pay_status = 'paid' then v_created + interval '5 minutes' end,
      case when v_status in ('shipped', 'delivered') then v_created + interval '20 hours' end,
      case when v_status = 'delivered' then v_created + interval '2 days' end,
      case when v_status = 'cancelled' then v_created + interval '3 hours' end,
      case when v_status = 'awaiting_payment' then v_created + interval '7 days' end);

    foreach v_slug in array v_slugs loop
      select v.id as variant_id, v.sku, v.name as variant_name, p.id as product_id, p.name, pi.url, pp.price
        into v_var
        from public.products p
        join public.product_variants v on v.product_id = p.id and v.is_default
        join public.product_prices pp on pp.variant_id = v.id and pp.market = v_market
        left join lateral (select url from public.product_images where product_id = p.id order by sort_order limit 1) pi on true
       where p.slug = v_slug;
      v_qty := case when i % 5 = 0 and v_slug = v_slugs[1] then 2 else 1 end;
      v_line := v_var.price * v_qty;
      v_line_tax := round(v_line::numeric * v_rate / (10000 + v_rate));
      v_subtotal := v_subtotal + v_line;
      v_tax := v_tax + v_line_tax;
      insert into public.order_items (order_id, product_id, variant_id, sku, name, variant_name, image_url, quantity,
                                      unit_price, tax_rate_bps, tax_amount, line_total, created_at)
      values (v_order, v_var.product_id, v_var.variant_id, v_var.sku, v_var.name, v_var.variant_name, v_var.url, v_qty,
              v_var.price, v_rate, v_line_tax, v_line, v_created);
      if v_open then
        update public.inventory set quantity_on_hand = quantity_on_hand + v_qty, quantity_reserved = quantity_reserved + v_qty
         where variant_id = v_var.variant_id;
      end if;
    end loop;

    select price into v_ship_price from public.shipping_method_markets where method_id = v_ship.id and market = v_market;
    if v_subtotal >= (select free_shipping_threshold from public.markets where code = v_market) then v_ship_price := 0; end if;
    v_fee := case when v_provider = 'cod' then (select fee from public.payment_method_markets where method_code = 'cod' and market = v_market) else 0 end;
    v_tax := v_tax + round((v_ship_price + v_fee)::numeric * v_rate / (10000 + v_rate));

    update public.orders set subtotal = v_subtotal, shipping_total = v_ship_price, payment_fee_total = v_fee, tax_total = v_tax,
           grand_total = v_subtotal + v_ship_price + v_fee,
           vat_breakdown = jsonb_build_array(jsonb_build_object('rate_bps', v_rate, 'total', v_subtotal + v_ship_price + v_fee,
                             'tax', v_tax, 'base', v_subtotal + v_ship_price + v_fee - v_tax))
     where id = v_order;

    insert into public.order_addresses (order_id, type, first_name, last_name, street, city, postal_code, country, phone)
    values (v_order, 'billing', v_addr.first_name, v_addr.last_name, v_addr.street, v_addr.city, v_addr.postal_code, v_addr.country, v_addr.phone);
    if v_ship.type = 'address' then
      insert into public.order_addresses (order_id, type, first_name, last_name, street, city, postal_code, country, phone)
      values (v_order, 'shipping', v_addr.first_name, v_addr.last_name, v_addr.street, v_addr.city, v_addr.postal_code, v_addr.country, v_addr.phone);
    end if;

    insert into public.payments (order_id, provider, method_code, status, amount, currency, provider_payment_id, paid_at, created_at)
    values (v_order, v_provider, v_pay_code, v_pay_status, v_subtotal + v_ship_price + v_fee, v_currency,
            case when v_provider = 'comgate' then 'SEED-' || upper(substr(md5(v_order::text), 1, 12)) end,
            case when v_pay_status = 'paid' then v_created + interval '5 minutes' end, v_created);

    insert into public.order_status_history (order_id, from_status, to_status, note, created_at)
    values (v_order, null, case when v_provider = 'cod' then 'new'::public.order_status else 'awaiting_payment'::public.order_status end,
            'Objednávka přijata', v_created);
    if v_status <> 'awaiting_payment' and v_status <> 'new' then
      insert into public.order_status_history (order_id, from_status, to_status, note, created_at)
      values (v_order, case when v_provider = 'cod' then 'new'::public.order_status else 'awaiting_payment'::public.order_status end,
              v_status, 'Demo historie', v_created + interval '1 hour');
    end if;

    if v_status in ('shipped', 'delivered') then
      insert into public.shipments (order_id, carrier, tracking_number, tracking_url, status, shipped_at, delivered_at, created_at)
      values (v_order, v_ship.carrier, 'Z' || lpad((floor(random() * 1e9))::bigint::text, 10, '0'),
              case when v_ship.carrier = 'packeta' then 'https://tracking.packeta.com/cs/?id=Z' || substr(md5(v_order::text), 1, 8) end,
              case when v_status = 'delivered' then 'delivered'::public.shipment_status else 'in_transit'::public.shipment_status end,
              v_created + interval '20 hours', case when v_status = 'delivered' then v_created + interval '2 days' end,
              v_created + interval '20 hours')
      returning id into v_shipment;
    end if;
  end loop;
end $$;

-- Rezervace otevřených objednávek do historie skladových pohybů
insert into public.inventory_movements (variant_id, reason, on_hand_delta, reserved_delta, on_hand_after, reserved_after, order_id, note, created_at)
select oi.variant_id, 'reservation', 0, oi.quantity, i.quantity_on_hand, i.quantity_reserved, o.id, 'Objednávka ' || o.number, o.created_at
  from public.order_items oi
  join public.orders o on o.id = oi.order_id and o.status in ('new', 'awaiting_payment', 'paid', 'processing', 'ready_to_ship')
  join public.inventory i on i.variant_id = oi.variant_id;

update public.products p set sold_count = s.qty
  from (select oi.product_id, sum(oi.quantity)::int as qty from public.order_items oi
          join public.orders o on o.id = oi.order_id and o.status <> 'cancelled' group by oi.product_id) s
 where s.product_id = p.id;

-- Notifikace k objednávkám dostanou datum objednávky; starší označíme jako přečtené
update public.notifications n set created_at = o.created_at from public.orders o where n.entity = 'order' and n.entity_id = o.id::text;
insert into public.notification_reads (notification_id, user_id)
select n.id, p.id from public.notifications n cross join public.profiles p
 where p.role <> 'customer' and n.created_at < now() - interval '2 days';

-- Recenze (ověřený nákup vyhodnotí trigger podle skutečných objednávek)
insert into public.reviews (product_id, user_id, author_name, author_city, rating, title, body, status, created_at)
select p.id, u.id, r.author, r.city, r.rating, r.title, r.body, r.status::public.review_status, now() - (r.age || ' days')::interval
  from (values
    ('color-pro-outdoor', 'martina@example.cz', 'Martina', 'Praha', 5, 'Konečně vidím podzim', 'Manžel poprvé rozeznal červené listy od zelených. Na túrách je nosí pořád.', 'approved', 9),
    ('color-protan', 'peter@example.sk', 'Peter', 'Bratislava', 5, 'Červená je konečne červená', 'Červená pôsobí sýtejšie a konečne ju odlíšim od hnedej. Doručenie do 2 dní.', 'approved', 8),
    ('color-deutan', 'tomas@example.cz', 'Tomáš', 'Brno', 5, 'Rozdíl hned', 'Rozdíl jsem viděl hned po nasazení, hlavně u zelené a oranžové.', 'approved', 7),
    ('color-pro-outdoor', 'jana@example.cz', 'Jana', 'Olomouc', 5, 'Polarizace super', 'Polarizace u vody je skvělá a barvy jsou výraznější. Syn je nechce sundat.', 'approved', 6),
    ('color-sport', 'lukas@example.cz', 'Lukáš', 'Ostrava', 4, 'Drží i na kole', 'Drží i na kole, značení v terénu vidím lépe. Pouzdro by mohlo být menší.', 'approved', 6),
    ('color-clip-on', 'lukas@example.cz', 'Lukáš', 'Ostrava', 5, 'Na dioptrické brýle ideální', 'Nástavec drží pevně a odklápění je praktické.', 'approved', 5),
    ('color-kids', 'katarina@example.sk', 'Katarína', 'Košice', 5, 'Dcéra je nadšená', 'Dcéra konečne rozlišuje farby pasteliek. Okuliare sú ľahké a pevné.', 'approved', 5),
    ('color-indoor', 'michal@example.cz', 'Michal', 'Plzeň', 5, 'Grafy v práci', 'V práci konečně rozliším barvy v grafech a kabelech.', 'approved', 4),
    ('color-tritan', 'eva@example.cz', 'Eva', 'Liberec', 4, 'Pomáhají', 'Modrá a zelená se mi už tolik neslévají. Chce to pár dní zvyku.', 'approved', 4),
    ('color-kids', 'martina@example.cz', 'Martina', 'Praha', 5, 'Syn je nosí rád', 'Syn je nosí rád a na hřišti je ani neodřel.', 'approved', 3),
    ('color-sport', 'tomas@example.cz', 'Tomáš', 'Brno', 5, 'Lehké a pohodlné', 'Lehké, pohodlné a barvy v přírodě jsou živější.', 'approved', 2),
    ('color-clip-on', 'eva@example.cz', 'Eva', 'Liberec', 3, 'Na mé obroučky trochu velké', 'Funguje dobře, ale na mé úzké obroučky je nástavec trochu velký.', 'pending', 1)
  ) as r(slug, email, author, city, rating, title, body, status, age)
  join public.products p on p.slug = r.slug
  join public.profiles u on u.email = r.email;

-- UKÁZKOVÁ HODNOCENÍ (DEMO): počty a průměry odpovídají grafice návrhu (4,9 / 312 …).
-- Slouží jen pro vývoj a náhled – v produkci se hodnocení počítá výhradně ze skutečných recenzí.
insert into public.reviews (product_id, author_name, author_city, rating, body, status, published_at, created_at)
select p.id,
       (array['Jana', 'Petr', 'Lucie', 'Tomáš', 'Eva', 'Martin', 'Kateřina', 'Jakub', 'Veronika', 'Ondřej', 'Lenka', 'David'])[1 + g % 12]
         || ' ' || chr(65 + (g * 7) % 26) || '.',
       (array['Praha', 'Brno', 'Ostrava', 'Plzeň', 'Olomouc', 'Liberec', 'Bratislava', 'Košice', 'Hradec Králové', 'Zlín'])[1 + g % 10],
       d.rating,
       case d.rating
         when 5 then (array['Barvy vidím výrazněji, hlavně venku na slunci.', 'Rozdíl mezi červenou a zelenou je konečně jasný.',
                            'Příroda vypadá úplně jinak, doporučuji.', 'Nosím je denně, pohodlné a lehké.', 'Rychlé doručení a skvělý efekt.',
                            'Na procházkách si konečně užívám barvy.', 'Překvapilo mě, jak moc pomáhají.', 'Kvalitní zpracování a hezké pouzdro.'])[1 + g % 8]
         when 4 then (array['Pomáhají, jen jsem si musel pár dní zvykat.', 'Efekt je znát hlavně venku.', 'Dobré brýle, pouzdro by mohlo být menší.',
                            'Barvy jsou živější, v interiéru méně výrazné.', 'Spokojenost, jen trochu těsnější stranice.'])[1 + g % 5]
         else (array['Efekt mírný, ale vidím rozdíl u červené.', 'Na mě fungují jen částečně.', 'Čekal jsem výraznější změnu.'])[1 + g % 3]
       end,
       'approved', now() - make_interval(hours => g * 7), now() - make_interval(hours => g * 7)
  from (values
    ('color-pro-outdoor', 5, 280),
    ('color-pro-outdoor', 4, 28),
    ('color-pro-outdoor', 3, 2),
    ('color-protan', 5, 149),
    ('color-protan', 4, 32),
    ('color-protan', 3, 2),
    ('color-deutan', 5, 86),
    ('color-deutan', 4, 8),
    ('color-deutan', 3, 1),
    ('color-sport', 5, 93),
    ('color-sport', 4, 29),
    ('color-sport', 3, 4),
    ('color-clip-on', 5, 59),
    ('color-clip-on', 4, 13),
    ('color-clip-on', 3, 1),
    ('color-kids', 5, 27),
    ('color-kids', 4, 7),
    ('color-tritan', 5, 14),
    ('color-tritan', 4, 5),
    ('color-tritan', 3, 1),
    ('color-indoor', 5, 34),
    ('color-indoor', 4, 7),
    ('color-indoor', 3, 1)
  ) as d(slug, rating, n)
  join public.products p on p.slug = d.slug
  cross join lateral generate_series(1, d.n) g;

-- Slevové kódy
insert into public.discounts (name, type, percent_bps, min_subtotal_czk, min_subtotal_eur, usage_limit_per_customer)
values ('Uvítací sleva 10 %', 'percentage', 1000, 100000, 4000, 1);
insert into public.discount_codes (discount_id, code) select id, 'VITEJTE10' from public.discounts where name = 'Uvítací sleva 10 %';
insert into public.discounts (name, type, usage_limit) values ('Doprava zdarma', 'free_shipping', 500);
insert into public.discount_codes (discount_id, code) select id, 'DOPRAVA0' from public.discounts where name = 'Doprava zdarma';
insert into public.discounts (name, type, amount_czk, amount_eur, min_subtotal_czk, min_subtotal_eur, applies_to)
values ('300 Kč na Clip-on', 'fixed_amount', 30000, 1200, 100000, 4000, 'categories');
insert into public.discount_targets (discount_id, target_type, target_id)
select d.id, 'category', c.id from public.discounts d, public.categories c where d.name = '300 Kč na Clip-on' and c.path = 'bryle/clip-on';
insert into public.discount_codes (discount_id, code) select id, 'CLIP300' from public.discounts where name = '300 Kč na Clip-on';
insert into public.discounts (name, type, percent_bps, usage_limit) values ('Jednorázový kód 15 %', 'percentage', 1500, 1);
insert into public.discount_codes (discount_id, code, usage_limit) select id, 'JEDNOU15', 1 from public.discounts where name = 'Jednorázový kód 15 %';

insert into public.newsletter_subscribers (email, status, market, locale, source, consent_text, confirmed_at) values
  ('jana@example.cz', 'confirmed', 'CZ', 'cs', 'checkout', 'Souhlasím se zasíláním obchodních sdělení.', now() - interval '20 days'),
  ('katarina@example.sk', 'confirmed', 'SK', 'sk', 'homepage', 'Súhlasím so zasielaním obchodných oznámení.', now() - interval '10 days');

insert into public.contact_messages (name, email, subject, message) values
  ('Jana Procházková', 'jana@example.cz', 'Dotaz k dostupnosti', 'Dobrý den, kdy budou znovu skladem hodinky Pulse Watch S4 ve velikosti 45 mm? Děkuji.');

insert into public.return_requests (order_id, user_id, type, items, reason)
select o.id, o.user_id, 'complaint', jsonb_build_array(jsonb_build_object('order_item_id', oi.id, 'quantity', 1)),
       'Koš fritézy po týdnu používání drhne při zasouvání.'
  from public.orders o join public.order_items oi on oi.order_id = o.id
  join public.products p on p.id = oi.product_id and p.slug = 'color-pro-outdoor'
  join public.profiles u on u.id = o.user_id and u.email = 'lukas@example.cz'
 where o.status = 'delivered'
 limit 1;

-- Prodeje za celou dobu (DEMO): pořadí bestsellerů podle návrhu
update public.products p set sold_count = x.n
  from (values ('color-pro-outdoor', 520), ('color-protan', 410), ('color-deutan', 330), ('color-sport', 260),
               ('color-clip-on', 190), ('color-kids', 150), ('color-indoor', 90), ('color-tritan', 40)) as x(slug, n)
 where p.slug = x.slug;

-- Demo data nesmí rozeslat e-maily skutečným adresám
delete from public.email_outbox;
