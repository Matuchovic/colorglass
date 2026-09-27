-- =============================================================================
-- COLOR · DEMO SEED (pouze pro lokální vývoj – NESPOUŠTĚT v produkci)
-- Demo účty, katalog podle návrhu, historie objednávek a ověřené recenze.
-- =============================================================================

create or replace function pg_temp.seed_user(p_email text, p_password text, p_first text, p_last text, p_role public.app_role)
returns uuid language plpgsql as $$
declare v_id uuid := gen_random_uuid();
begin
  insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
                          raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
                          confirmation_token, recovery_token, email_change_token_new, email_change)
  values ('00000000-0000-0000-0000-000000000000', v_id, 'authenticated', 'authenticated', p_email,
          extensions.crypt(p_password, extensions.gen_salt('bf')), now(),
          '{"provider": "email", "providers": ["email"]}',
          jsonb_build_object('first_name', p_first, 'last_name', p_last), now() - interval '90 days', now(), '', '', '', '');
  insert into auth.identities (provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  values (v_id::text, v_id, jsonb_build_object('sub', v_id::text, 'email', p_email, 'email_verified', true),
          'email', now(), now(), now());
  update public.profiles set role = p_role, created_at = now() - interval '90 days' where id = v_id;
  return v_id;
end $$;

select pg_temp.seed_user('admin@color.test', 'ColorAdmin-2026!', 'Alena', 'Správcová', 'superadmin');
select pg_temp.seed_user('manazer@color.test', 'ColorManazer-2026!', 'Marek', 'Novotný', 'manager');
select pg_temp.seed_user('sklad@color.test', 'ColorSklad-2026!', 'Karel', 'Skladník', 'warehouse');
select pg_temp.seed_user('podpora@color.test', 'ColorPodpora-2026!', 'Petra', 'Veselá', 'support');
select pg_temp.seed_user('martina@example.cz', 'Zakaznik-2026!', 'Martina', 'Horáková', 'customer');
select pg_temp.seed_user('peter@example.sk', 'Zakaznik-2026!', 'Peter', 'Kováč', 'customer');
select pg_temp.seed_user('tomas@example.cz', 'Zakaznik-2026!', 'Tomáš', 'Dvořák', 'customer');
select pg_temp.seed_user('jana@example.cz', 'Zakaznik-2026!', 'Jana', 'Procházková', 'customer');
select pg_temp.seed_user('lukas@example.cz', 'Zakaznik-2026!', 'Lukáš', 'Král', 'customer');
select pg_temp.seed_user('katarina@example.sk', 'Zakaznik-2026!', 'Katarína', 'Horváthová', 'customer');
select pg_temp.seed_user('michal@example.cz', 'Zakaznik-2026!', 'Michal', 'Beneš', 'customer');
select pg_temp.seed_user('eva@example.cz', 'Zakaznik-2026!', 'Eva', 'Marková', 'customer');

update public.profiles set preferred_market = 'SK' where email in ('peter@example.sk', 'katarina@example.sk');

insert into public.addresses (user_id, label, first_name, last_name, street, city, postal_code, country, phone, is_default_shipping, is_default_billing)
select p.id, 'Domů', p.first_name, p.last_name, a.street, a.city, a.zip, a.country::public.market_code, a.phone, true, true
  from public.profiles p
  join (values
    ('martina@example.cz', 'Vinohradská 1250/48', 'Praha 2', '120 00', 'CZ', '+420 604 111 222'),
    ('peter@example.sk', 'Obchodná 12', 'Bratislava', '811 06', 'SK', '+421 905 111 222'),
    ('tomas@example.cz', 'Kounicova 684/10', 'Brno', '602 00', 'CZ', '+420 605 333 444'),
    ('jana@example.cz', 'Masarykova 22', 'Olomouc', '779 00', 'CZ', '+420 606 555 666'),
    ('lukas@example.cz', 'Nádražní 118', 'Ostrava', '702 00', 'CZ', '+420 607 777 888'),
    ('katarina@example.sk', 'Hlavná 45', 'Košice', '040 01', 'SK', '+421 907 333 444'),
    ('michal@example.cz', 'Palackého 9', 'Plzeň', '301 00', 'CZ', '+420 608 999 000'),
    ('eva@example.cz', 'Husova 77', 'Liberec', '460 01', 'CZ', '+420 602 222 333')
  ) as a(email, street, city, zip, country, phone) on a.email = p.email;

insert into public.brands (slug, name, description) values
  ('color', 'COLOR', 'Brýle pro barvoslepé se speciálními filtračními čočkami.');

insert into public.attributes (code, name, type, unit, is_filterable, is_comparable, sort_order, translations) values
  ('typ_vady', 'Typ vady', 'multiselect', null, true, true, 1, '{"sk": {"name": "Typ poruchy"}}'),
  ('pouziti', 'Použití', 'multiselect', null, true, true, 2, '{"sk": {"name": "Použitie"}}'),
  ('barva_ramu', 'Barva rámu', 'multiselect', null, true, true, 3, '{"sk": {"name": "Farba rámu"}}'),
  ('barva_cocek', 'Barva čoček', 'select', null, true, true, 4, '{"sk": {"name": "Farba šošoviek"}}'),
  ('uv_ochrana', 'UV ochrana', 'select', null, false, true, 5, '{"sk": {"name": "UV ochrana"}}'),
  ('material_ramu', 'Materiál rámu', 'select', null, true, true, 6, '{"sk": {"name": "Materiál rámu"}}'),
  ('sirka_bryli', 'Šířka brýlí', 'number', 'mm', false, true, 7, '{"sk": {"name": "Šírka okuliarov"}}'),
  ('hmotnost', 'Hmotnost', 'number', 'g', false, true, 8, '{"sk": {"name": "Hmotnosť"}}'),
  ('polarizace', 'Polarizace', 'boolean', null, false, true, 9, '{"sk": {"name": "Polarizácia"}}');

insert into public.attribute_values (attribute_id, value, slug, color_hex, sort_order, translations)
select a.id, v.value, v.slug, v.color, v.sort_order, v.tr::jsonb
  from public.attributes a
  join (values
    ('typ_vady', 'Protan (červená)', 'protan', null, 1, '{"sk": {"value": "Protan (červená)"}}'),
    ('typ_vady', 'Deutan (zelená)', 'deutan', null, 2, '{"sk": {"value": "Deutan (zelená)"}}'),
    ('typ_vady', 'Tritan (modro-žlutá)', 'tritan', null, 3, '{"sk": {"value": "Tritan (modro-žltá)"}}'),
    ('pouziti', 'Venku', 'venku', null, 1, '{"sk": {"value": "Vonku"}}'),
    ('pouziti', 'Uvnitř', 'uvnitr', null, 2, '{"sk": {"value": "Vnútri"}}'),
    ('pouziti', 'Sport', 'sport', null, 3, '{}'),
    ('pouziti', 'Na dioptrické brýle', 'na-dioptricke', null, 4, '{"sk": {"value": "Na dioptrické okuliare"}}'),
    ('barva_ramu', 'Černá', 'cerna', '#111827', 1, '{"sk": {"value": "Čierna"}}'),
    ('barva_ramu', 'Průhledná', 'pruhledna', '#E6EEF5', 2, '{"sk": {"value": "Priehľadná"}}'),
    ('barva_ramu', 'Růžová', 'ruzova', '#F472B6', 3, '{"sk": {"value": "Ružová"}}'),
    ('barva_ramu', 'Havana', 'havana', '#7A4A2A', 4, '{}'),
    ('barva_cocek', 'Modré zrcadlo', 'modre-zrcadlo', '#2563EB', 1, '{"sk": {"value": "Modré zrkadlo"}}'),
    ('barva_cocek', 'Červená', 'cervena', '#E11D48', 2, '{"sk": {"value": "Červená"}}'),
    ('barva_cocek', 'Zelená', 'zelena', '#16A34A', 3, '{"sk": {"value": "Zelená"}}'),
    ('barva_cocek', 'Šedá', 'seda', '#4B5563', 4, '{"sk": {"value": "Sivá"}}'),
    ('barva_cocek', 'Jantarová', 'jantarova', '#D97706', 5, '{"sk": {"value": "Jantárová"}}'),
    ('barva_cocek', 'Světlá', 'svetla', '#E5E7EB', 6, '{"sk": {"value": "Svetlá"}}'),
    ('uv_ochrana', 'UV400', 'uv400', null, 1, '{}'),
    ('material_ramu', 'TR90', 'tr90', null, 1, '{}'),
    ('material_ramu', 'Acetát', 'acetat', null, 2, '{}'),
    ('material_ramu', 'Kov', 'kov', null, 3, '{}')
  ) as v(code, value, slug, color, sort_order, tr) on v.code = a.code;

insert into public.category_attributes (category_id, attribute_id, sort_order)
select c.id, a.id, x.ord
  from public.categories c
  cross join (values ('typ_vady', 1), ('pouziti', 2), ('barva_ramu', 3), ('barva_cocek', 4), ('material_ramu', 5)) as x(code, ord)
  join public.attributes a on a.code = x.code
 where c.path = 'bryle' or c.path like 'bryle/%';
-- Produkty podle návrhu COLOR: 6 z homepage + Tritan a Indoor (aby žádná kategorie nebyla prázdná)
create or replace function pg_temp.seed_product(p jsonb) returns uuid language plpgsql as $$
declare
  v_id uuid;
  v jsonb;
  v_vid uuid;
  a record;
  v_val text;
  i integer := 0;
begin
  insert into public.products (slug, name, subtitle, brand_id, primary_category_id, short_description, description,
    package_contents, badge, is_active, is_featured, weight_grams, length_mm, width_mm, height_mm, warranty_months,
    seo_title, seo_description, translations, published_at)
  values (p ->> 'slug', p ->> 'name', p ->> 'subtitle', (select id from public.brands where slug = p ->> 'brand'),
    (select id from public.categories where path = p ->> 'category'), p ->> 'short', p ->> 'description', p ->> 'contents',
    p ->> 'badge', true, coalesce((p ->> 'featured')::boolean, false), (p ->> 'weight')::int, (p ->> 'l')::int,
    (p ->> 'w')::int, (p ->> 'h')::int, 24, p ->> 'seo_title', p ->> 'seo_description', coalesce(p -> 'translations', '{}'::jsonb),
    now() - make_interval(days => coalesce((p ->> 'age_days')::int, 60)))
  returning id into v_id;

  insert into public.product_categories (product_id, category_id)
  select v_id, id from public.categories
   where path = p ->> 'category' or path in (select jsonb_array_elements_text(coalesce(p -> 'extra', '[]'::jsonb)));
  insert into public.product_images (product_id, url, alt, width, height, sort_order)
  values (v_id, '/images/products/' || (p ->> 'image') || '.webp', p ->> 'name', 1200, 900, 0);

  for v in select * from jsonb_array_elements(p -> 'variants') loop
    i := i + 1;
    insert into public.product_variants (product_id, sku, ean, name, options, is_default, sort_order, weight_grams)
    values (v_id, v ->> 'sku', v ->> 'ean', v ->> 'name', coalesce(v -> 'options', '{}'::jsonb), i = 1, i, (v ->> 'weight')::int)
    returning id into v_vid;
    insert into public.product_prices (variant_id, market, price, compare_at_price) values
      (v_vid, 'CZ', (v ->> 'cz')::bigint, (v ->> 'cz_was')::bigint),
      (v_vid, 'SK', (v ->> 'sk')::bigint, (v ->> 'sk_was')::bigint);
    -- předchozí (vyšší) cena pro výpočet nejnižší ceny za 30 dní před slevou
    if v ? 'cz_was' then
      insert into public.price_history (variant_id, market, price, valid_from) values
        (v_vid, 'CZ', (v ->> 'cz_was')::bigint, now() - interval '75 days'),
        (v_vid, 'SK', (v ->> 'sk_was')::bigint, now() - interval '75 days');
    end if;
    update public.inventory
       set quantity_on_hand = (v ->> 'stock')::int,
           low_stock_threshold = coalesce((v ->> 'threshold')::int, 5),
           restock_date = (v ->> 'restock')::date
     where variant_id = v_vid;
    insert into public.inventory_movements (variant_id, reason, on_hand_delta, reserved_delta, on_hand_after, reserved_after, note)
    values (v_vid, 'initial', (v ->> 'stock')::int, 0, (v ->> 'stock')::int, 0, 'Počáteční stav (demo)');
  end loop;

  for a in select key, value from jsonb_each(coalesce(p -> 'attrs', '{}'::jsonb)) loop
    if jsonb_typeof(a.value) = 'array' then
      for v_val in select jsonb_array_elements_text(a.value) loop
        insert into public.product_attribute_values (product_id, attribute_id, value_id)
        select v_id, at.id, av.id from public.attributes at
          join public.attribute_values av on av.attribute_id = at.id
         where at.code = a.key and av.slug = v_val;
      end loop;
    elsif jsonb_typeof(a.value) = 'number' then
      insert into public.product_attribute_values (product_id, attribute_id, value_number)
      select v_id, id, (a.value #>> '{}')::numeric from public.attributes where code = a.key;
    elsif jsonb_typeof(a.value) = 'boolean' then
      insert into public.product_attribute_values (product_id, attribute_id, value_boolean)
      select v_id, id, (a.value #>> '{}')::boolean from public.attributes where code = a.key;
    end if;
  end loop;
  return v_id;
end $$;


select pg_temp.seed_product($j${"slug": "color-pro-outdoor", "name": "COLOR Pro Outdoor", "brand": "color", "category": "bryle/outdoor", "extra": ["bryle/protan", "bryle/deutan"], "image": "color-pro-outdoor", "featured": true, "weight": 119, "l": 170, "w": 65, "h": 55, "age_days": 210, "subtitle": "Polarizační sluneční brýle pro červeno-zelenou vadu", "short": "Náš nejprodávanější model do přírody: filtrační čočky zvýrazní rozdíl mezi červenou a zelenou, polarizace potlačí odlesky z vody a silnice.", "description": "## Barvy venku jako nikdy předtím\nSpeciální filtrační vrstvy zvyšují kontrast mezi barvami, které při protanomálii a deuteranomálii splývají – listí, květiny, ovoce i značení na turistických trasách.\n\n## Co oceníte\n- Polarizace proti odleskům z vody, sněhu a silnice\n- Ochrana UV400\n- Lehký a pružný rám TR90 (29 g)\n- Pouzdro a čisticí hadřík v balení", "contents": "Brýle COLOR Pro Outdoor\nPevné pouzdro\nČisticí hadřík z mikrovlákna\nNávod a certifikát shody", "seo_description": "COLOR Pro Outdoor – polarizační sluneční brýle pro červeno-zelenou vadu. 30 dní na vyzkoušení, doprava od 799 Kč zdarma.", "translations": {"sk": {"subtitle": "Polarizačné slnečné okuliare pre červeno-zelenú poruchu", "short_description": "Náš najpredávanejší model do prírody: filtračné šošovky zvýraznia rozdiel medzi červenou a zelenou, polarizácia potlačí odlesky."}}, "variants": [{"sku": "CLR-PROOUTDOOR", "ean": "8594000000013", "cz": 299000, "sk": 11900, "stock": 64, "weight": 119}], "attrs": {"typ_vady": ["protan", "deutan"], "pouziti": ["venku", "sport"], "barva_ramu": ["cerna"], "barva_cocek": ["modre-zrcadlo"], "uv_ochrana": ["uv400"], "material_ramu": ["tr90"], "sirka_bryli": 142, "hmotnost": 29, "polarizace": true}, "badge": "bestseller"}$j$::jsonb);

select pg_temp.seed_product($j${"slug": "color-protan", "name": "COLOR Protan", "brand": "color", "category": "bryle/protan", "extra": ["bryle/outdoor"], "image": "color-protan", "featured": false, "weight": 121, "l": 170, "w": 65, "h": 55, "age_days": 160, "subtitle": "Sluneční brýle s filtrem pro protany", "short": "Filtr laděný pro oslabené vnímání červené. Červené odstíny působí sytěji a snáz je odlišíte od zelené a hnědé.", "description": "## Pro oslabené vnímání červené\nPři protanomálii bývá červená tmavší a splývá s hnědou nebo zelenou. Čočky COLOR Protan jsou laděné právě na tuto oblast spektra.\n\n## Co oceníte\n- Filtr laděný pro protany\n- Ochrana UV400\n- Rám TR90, hmotnost 31 g", "contents": "Brýle COLOR Protan\nPevné pouzdro\nČisticí hadřík z mikrovlákna\nNávod a certifikát shody", "seo_description": "COLOR Protan – sluneční brýle s filtrem pro protany. 30 dní na vyzkoušení, doprava od 799 Kč zdarma.", "translations": {"sk": {"subtitle": "Slnečné okuliare s filtrom pre protanov", "short_description": "Filter ladený pre oslabené vnímanie červenej. Červené odtiene pôsobia sýtejšie a ľahšie ich odlíšite."}}, "variants": [{"sku": "CLR-PROTAN", "ean": "8594000000020", "cz": 199000, "sk": 7900, "stock": 38, "weight": 121, "cz_was": 249000, "sk_was": 9900}], "attrs": {"typ_vady": ["protan"], "pouziti": ["venku"], "barva_ramu": ["cerna"], "barva_cocek": ["cervena"], "uv_ochrana": ["uv400"], "material_ramu": ["tr90"], "sirka_bryli": 144, "hmotnost": 31, "polarizace": false}}$j$::jsonb);

select pg_temp.seed_product($j${"slug": "color-deutan", "name": "COLOR Deutan", "brand": "color", "category": "bryle/deutan", "extra": ["bryle/outdoor"], "image": "color-deutan", "featured": false, "weight": 118, "l": 170, "w": 65, "h": 55, "age_days": 12, "subtitle": "Sluneční brýle s filtrem pro deutany", "short": "Nový model pro nejčastější typ vady – oslabené vnímání zelené. Zelená, červená i oranžová se od sebe zřetelně oddělí.", "description": "## Pro oslabené vnímání zelené\nDeuteranomálie je nejčastější porucha barvocitu. Čočky COLOR Deutan zvýrazní rozdíl mezi zelenými, červenými a oranžovými odstíny.\n\n## Co oceníte\n- Filtr laděný pro deutany\n- Ochrana UV400\n- Lehký rám TR90, 28 g", "contents": "Brýle COLOR Deutan\nPevné pouzdro\nČisticí hadřík z mikrovlákna\nNávod a certifikát shody", "seo_description": "COLOR Deutan – sluneční brýle s filtrem pro deutany. 30 dní na vyzkoušení, doprava od 799 Kč zdarma.", "translations": {"sk": {"subtitle": "Slnečné okuliare s filtrom pre deutanov", "short_description": "Nový model pre najčastejší typ poruchy – oslabené vnímanie zelenej."}}, "variants": [{"sku": "CLR-DEUTAN", "ean": "8594000000037", "cz": 249000, "sk": 9900, "stock": 45, "weight": 118}], "attrs": {"typ_vady": ["deutan"], "pouziti": ["venku", "sport"], "barva_ramu": ["cerna"], "barva_cocek": ["zelena"], "uv_ochrana": ["uv400"], "material_ramu": ["tr90"], "sirka_bryli": 140, "hmotnost": 28, "polarizace": false}, "badge": "new"}$j$::jsonb);

select pg_temp.seed_product($j${"slug": "color-sport", "name": "COLOR Sport", "brand": "color", "category": "bryle/outdoor", "extra": ["bryle/protan", "bryle/deutan"], "image": "color-sport", "featured": false, "weight": 117, "l": 170, "w": 65, "h": 55, "age_days": 130, "subtitle": "Sportovní brýle s filtrem pro barvocit", "short": "Obepínající tvar, který drží při běhu i na kole. Filtr pro červeno-zelenou vadu a ochrana UV400.", "description": "## Na kolo, běh i hory\nObepínající tvar chrání oči před větrem a nesklouzne ani při sportu. Filtrační čočky zvýrazní barvy v terénu.\n\n## Co oceníte\n- Protiskluzové nosníky a stranice\n- Ochrana UV400\n- Rám TR90, 27 g", "contents": "Brýle COLOR Sport\nPevné pouzdro\nČisticí hadřík z mikrovlákna\nNávod a certifikát shody", "seo_description": "COLOR Sport – sportovní brýle s filtrem pro barvocit. 30 dní na vyzkoušení, doprava od 799 Kč zdarma.", "translations": {"sk": {"subtitle": "Športové okuliare s filtrom pre farbocit", "short_description": "Obopínajúci tvar, ktorý drží pri behu aj na bicykli."}}, "variants": [{"sku": "CLR-SPORT", "ean": "8594000000044", "cz": 299000, "sk": 11900, "stock": 27, "weight": 117}], "attrs": {"typ_vady": ["protan", "deutan"], "pouziti": ["venku", "sport"], "barva_ramu": ["cerna"], "barva_cocek": ["seda"], "uv_ochrana": ["uv400"], "material_ramu": ["tr90"], "sirka_bryli": 146, "hmotnost": 27, "polarizace": true}}$j$::jsonb);

select pg_temp.seed_product($j${"slug": "color-clip-on", "name": "COLOR Clip-on", "brand": "color", "category": "bryle/clip-on", "extra": ["bryle/protan", "bryle/deutan"], "image": "color-clip-on", "featured": false, "weight": 104, "l": 170, "w": 65, "h": 55, "age_days": 190, "subtitle": "Filtrační nástavec na dioptrické brýle", "short": "Nosíte dioptrické brýle? Filtrační nástavec připnete během vteřiny a odklopíte, když ho nepotřebujete.", "description": "## Pro nositele dioptrických brýlí\nNástavec se připne na většinu obrouček a jde odklopit nahoru.\n\n## Co oceníte\n- Odklopný mechanismus\n- Ochrana UV400\n- Jen 14 g", "contents": "Brýle COLOR Clip-on\nPevné pouzdro\nČisticí hadřík z mikrovlákna\nNávod a certifikát shody", "seo_description": "COLOR Clip-on – filtrační nástavec na dioptrické brýle. 30 dní na vyzkoušení, doprava od 799 Kč zdarma.", "translations": {"sk": {"subtitle": "Filtračný nástavec na dioptrické okuliare", "short_description": "Nosíte dioptrické okuliare? Filtračný nástavec pripnete za sekundu."}}, "variants": [{"sku": "CLR-CLIPON", "ean": "8594000000051", "cz": 149000, "sk": 5900, "stock": 52, "weight": 104}], "attrs": {"typ_vady": ["protan", "deutan"], "pouziti": ["na-dioptricke", "venku"], "barva_ramu": ["cerna"], "barva_cocek": ["seda"], "uv_ochrana": ["uv400"], "material_ramu": ["kov"], "sirka_bryli": 138, "hmotnost": 14, "polarizace": false}}$j$::jsonb);

select pg_temp.seed_product($j${"slug": "color-kids", "name": "COLOR Kids", "brand": "color", "category": "bryle/detske", "extra": ["bryle/protan", "bryle/deutan"], "image": "color-kids", "featured": false, "weight": 109, "l": 170, "w": 65, "h": 55, "age_days": 95, "subtitle": "Dětské brýle s filtrem pro barvocit", "short": "Lehké, ohebné a odolné brýle pro děti od 5 let. Pomohou rozlišit barvy pastelek, hraček i semaforu.", "description": "## Pro malé objevitele\nOhebný rám vydrží i dětské hry. Filtr zvýrazní rozdíl mezi červenou a zelenou.\n\n## Co oceníte\n- Ohebný a odolný rám TR90\n- Ochrana UV400\n- Hmotnost 19 g, pro děti od 5 let", "contents": "Brýle COLOR Kids\nPevné pouzdro\nČisticí hadřík z mikrovlákna\nNávod a certifikát shody", "seo_description": "COLOR Kids – dětské brýle s filtrem pro barvocit. 30 dní na vyzkoušení, doprava od 799 Kč zdarma.", "translations": {"sk": {"subtitle": "Detské okuliare s filtrom pre farbocit", "short_description": "Ľahké, ohybné a odolné okuliare pre deti od 5 rokov."}}, "variants": [{"sku": "CLR-KIDS", "ean": "8594000000068", "cz": 179000, "sk": 6900, "stock": 33, "weight": 109}], "attrs": {"typ_vady": ["protan", "deutan"], "pouziti": ["venku"], "barva_ramu": ["ruzova"], "barva_cocek": ["modre-zrcadlo"], "uv_ochrana": ["uv400"], "material_ramu": ["tr90"], "sirka_bryli": 124, "hmotnost": 19, "polarizace": false}}$j$::jsonb);

select pg_temp.seed_product($j${"slug": "color-tritan", "name": "COLOR Tritan", "brand": "color", "category": "bryle/tritan", "extra": ["bryle/outdoor"], "image": "color-tritan", "featured": false, "weight": 120, "l": 170, "w": 65, "h": 55, "age_days": 70, "subtitle": "Brýle s filtrem pro modro-žlutou vadu", "short": "Model pro vzácnou tritanomálii – zvýrazní rozdíl mezi modrou, zelenou a žlutou.", "description": "## Pro modro-žlutou vadu\nPři tritanomálii splývají modré a zelené, případně žluté a růžové odstíny. Čočky COLOR Tritan jsou laděné na tuto oblast.\n\n## Co oceníte\n- Filtr laděný pro tritany\n- Ochrana UV400\n- Acetátový rám, 30 g", "contents": "Brýle COLOR Tritan\nPevné pouzdro\nČisticí hadřík z mikrovlákna\nNávod a certifikát shody", "seo_description": "COLOR Tritan – brýle s filtrem pro modro-žlutou vadu. 30 dní na vyzkoušení, doprava od 799 Kč zdarma.", "translations": {"sk": {"subtitle": "Okuliare s filtrom pre modro-žltú poruchu", "short_description": "Model pre zriedkavú tritanomáliu – zvýrazní rozdiel medzi modrou, zelenou a žltou."}}, "variants": [{"sku": "CLR-TRITAN", "ean": "8594000000075", "cz": 249000, "sk": 9900, "stock": 18, "weight": 120}], "attrs": {"typ_vady": ["tritan"], "pouziti": ["venku"], "barva_ramu": ["havana"], "barva_cocek": ["jantarova"], "uv_ochrana": ["uv400"], "material_ramu": ["acetat"], "sirka_bryli": 142, "hmotnost": 30, "polarizace": false}}$j$::jsonb);

select pg_temp.seed_product($j${"slug": "color-indoor", "name": "COLOR Indoor", "brand": "color", "category": "bryle/indoor", "extra": ["bryle/protan", "bryle/deutan"], "image": "color-indoor", "featured": false, "weight": 114, "l": 170, "w": 65, "h": 55, "age_days": 80, "subtitle": "Brýle do interiéru pro práci a školu", "short": "Světlejší filtr pro umělé osvětlení – grafy, mapy i barevné kabely v práci a ve škole.", "description": "## Do kanceláře i do školy\nSvětlejší filtrační čočky jsou určené pro umělé osvětlení a práci u obrazovky.\n\n## Co oceníte\n- Filtr pro vnitřní osvětlení\n- Průhledný rám TR90\n- Hmotnost 24 g", "contents": "Brýle COLOR Indoor\nPevné pouzdro\nČisticí hadřík z mikrovlákna\nNávod a certifikát shody", "seo_description": "COLOR Indoor – brýle do interiéru pro práci a školu. 30 dní na vyzkoušení, doprava od 799 Kč zdarma.", "translations": {"sk": {"subtitle": "Okuliare do interiéru na prácu a do školy", "short_description": "Svetlejší filter pre umelé osvetlenie – grafy, mapy aj farebné káble."}}, "variants": [{"sku": "CLR-INDOOR", "ean": "8594000000082", "cz": 219000, "sk": 8900, "stock": 40, "weight": 114}], "attrs": {"typ_vady": ["protan", "deutan"], "pouziti": ["uvnitr"], "barva_ramu": ["pruhledna"], "barva_cocek": ["svetla"], "uv_ochrana": ["uv400"], "material_ramu": ["tr90"], "sirka_bryli": 140, "hmotnost": 24, "polarizace": false}}$j$::jsonb);
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
