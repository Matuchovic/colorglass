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
