-- =============================================================================
-- COLOR 0005 · Storefront: překlady, produktové karty, výpis s filtry a řazením,
-- disjunktivní fasety, detail produktu, našeptávač, homepage v jednom dotazu.
-- Vše set-based (žádné N+1), ceny a dostupnost vždy z DB.
-- =============================================================================

create or replace function public.tr(p_translations jsonb, p_locale text, p_field text, p_fallback text)
returns text language sql immutable parallel safe set search_path = '' as $$
  select coalesce(nullif(p_translations -> p_locale ->> p_field, ''), p_fallback)
$$;

create or replace function public.market_locale(p_market public.market_code)
returns text language sql immutable parallel safe set search_path = '' as $$
  select case p_market when 'SK' then 'sk' else 'cs' end
$$;

-- Produktové karty pro zadané ID (zachovává pořadí vstupu)
create or replace function public.product_cards(p_ids uuid[], p_market public.market_code)
returns jsonb language sql stable security definer set search_path = '' as $$
  with ids as (
    select t.id, min(t.ord) as ord from unnest(p_ids) with ordinality as t(id, ord) group by t.id
  ),
  mk as (select m.currency from public.markets m where m.code = p_market),
  alt as (
    select m.code, m.currency from public.markets m
     where m.code <> p_market and m.is_active order by m.sort_order limit 1
  ),
  vv as (
    select v.product_id, v.id as variant_id, v.is_default, pp.price, pp.compare_at_price,
           ap.price as alt_price,
           greatest(coalesce(i.quantity_on_hand, 0) - coalesce(i.quantity_reserved, 0), 0) as available,
           coalesce(i.allow_backorder, false) as backorder,
           coalesce(i.low_stock_threshold, 5) as threshold
      from ids
      join public.product_variants v on v.product_id = ids.id and v.is_active
      join public.product_prices pp on pp.variant_id = v.id and pp.market = p_market
      left join public.product_prices ap on ap.variant_id = v.id and ap.market = (select code from alt)
      left join public.inventory i on i.variant_id = v.id
  ),
  agg as (
    select product_id, count(*)::int as variant_count, sum(available)::int as available,
           bool_or(backorder) as backorder, min(threshold) as threshold,
           (array_agg(variant_id order by is_default desc, price asc))[1] as default_variant_id
      from vv group by product_id
  ),
  cheapest as (
    select distinct on (product_id) product_id, variant_id, price, compare_at_price, alt_price
      from vv order by product_id, price asc, is_default desc
  ),
  img as (
    select distinct on (pi.product_id) pi.product_id, pi.url, pi.alt
      from public.product_images pi join ids on ids.id = pi.product_id
     order by pi.product_id, pi.sort_order, pi.created_at
  )
  select coalesce(jsonb_agg(jsonb_build_object(
      'id', p.id,
      'slug', p.slug,
      'name', public.tr(p.translations, public.market_locale(p_market), 'name', p.name),
      'brand', case when b.id is null then null else jsonb_build_object('name', b.name, 'slug', b.slug) end,
      'image', case when img.url is null then null
                    else jsonb_build_object('url', img.url, 'alt', coalesce(nullif(img.alt, ''), p.name)) end,
      'price', c.price,
      -- Přeškrtnutá cena = nejnižší cena za 30 dní před slevou (§ 12a zák. o ochraně spotřebitele),
      -- zobrazí se jen při skutečném snížení ceny
      'compare_at', nullif(greatest(coalesce(public.lowest_price_30d(c.variant_id, p_market), 0), c.price), c.price),
      'currency', (select currency from mk),
      'alt_price', c.alt_price,
      'alt_currency', (select currency from alt),
      'rating_avg', p.rating_avg,
      'rating_count', p.rating_count,
      'badge', p.badge,
      'available', a.available,
      'stock', public.stock_state(a.available, a.backorder, a.threshold),
      'variant_id', a.default_variant_id,
      'variant_count', a.variant_count
    ) order by ids.ord), '[]'::jsonb)
  from ids
  join public.products p on p.id = ids.id and p.is_active
  join agg a on a.product_id = p.id
  join cheapest c on c.product_id = p.id
  left join public.brands b on b.id = p.brand_id and b.is_active
  left join img on img.product_id = p.id
$$;

-- Základní množina produktů (kategorie vč. podkategorií, značka, fulltext s tolerancí překlepů)
create or replace function public.catalog_base(
  p_market public.market_code, p_category_path text, p_brand_slug text, p_query text
) returns table (
  product_id uuid, brand_id uuid, brand_slug text, min_price bigint, compare_at bigint,
  available integer, rating_avg numeric, rating_count integer, sold_count integer,
  published_at timestamptz, is_featured boolean, score real
)
language plpgsql stable security definer
set search_path = ''
set pg_trgm.word_similarity_threshold = 0.45
as $$
declare
  v_raw text := nullif(btrim(left(p_query, 100)), '');
  v_q text := nullif(public.search_normalize(left(p_query, 100)), '');
  v_words text[];
  v_longest text;
begin
  if v_q is not null then
    select array_agg(w) into v_words from unnest(string_to_array(v_q, ' ')) w where char_length(w) >= 2;
    select w into v_longest from unnest(coalesce(v_words, array[v_q])) w order by char_length(w) desc limit 1;
  end if;
  return query
  select p.id, p.brand_id, b.slug, pr.min_price, pr.compare_at, pr.available,
         p.rating_avg, p.rating_count, p.sold_count, p.published_at, p.is_featured,
         case when v_q is null then 0::real
              else extensions.word_similarity(v_q, p.search_text)
                   + case when public.search_normalize(p.name) like v_q || '%' then 1 else 0 end end::real
    from public.products p
    left join public.brands b on b.id = p.brand_id
    join lateral (
      select min(pp.price) as min_price,
             (array_agg(pp.compare_at_price order by pp.price))[1] as compare_at,
             coalesce(sum(greatest(coalesce(i.quantity_on_hand, 0) - coalesce(i.quantity_reserved, 0), 0)), 0)::int as available
        from public.product_variants v
        join public.product_prices pp on pp.variant_id = v.id and pp.market = p_market
        left join public.inventory i on i.variant_id = v.id
       where v.product_id = p.id and v.is_active
    ) pr on pr.min_price is not null
   where p.is_active
     and (p_category_path is null or exists (
           select 1 from public.product_categories pc
             join public.categories c on c.id = pc.category_id
            where pc.product_id = p.id and c.is_active
              and (c.path = p_category_path or c.path like p_category_path || '/%')))
     and (p_brand_slug is null or b.slug = p_brand_slug)
     and (v_q is null
          or exists (select 1 from public.product_variants sv
                      where sv.product_id = p.id and (upper(sv.sku) = upper(v_raw) or sv.ean = v_raw))
          or ((p.search_text like '%' || v_longest || '%' or v_longest operator(extensions.<%) p.search_text)
              and not exists (
                select 1 from unnest(coalesce(v_words, array[v_q])) w
                 where not (p.search_text like '%' || w || '%' or w operator(extensions.<%) p.search_text))));
end $$;

-- Výpis produktů: filtry (AND mezi parametry, OR mezi hodnotami), řazení, stránkování
create or replace function public.catalog_list(
  p_market public.market_code,
  p_category_path text default null,
  p_brand_slug text default null,
  p_query text default null,
  p_brands text[] default '{}',
  p_filters jsonb default '{}'::jsonb,
  p_price_min bigint default null,
  p_price_max bigint default null,
  p_in_stock boolean default false,
  p_min_rating numeric default null,
  p_on_sale boolean default false,
  p_sort text default 'recommended',
  p_page integer default 1,
  p_per_page integer default 24
) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  v_per integer := least(greatest(coalesce(p_per_page, 24), 1), 96);
  v_page integer := least(greatest(coalesce(p_page, 1), 1), 500);
  v_total integer := 0;
  v_ids uuid[];
  v_has_query boolean := nullif(btrim(coalesce(p_query, '')), '') is not null;
begin
  with base as (
    select * from public.catalog_base(p_market, p_category_path, p_brand_slug, p_query) cb
     where (coalesce(cardinality(p_brands), 0) = 0 or cb.brand_slug = any(p_brands))
       and (p_price_min is null or cb.min_price >= p_price_min)
       and (p_price_max is null or cb.min_price <= p_price_max)
       and (not coalesce(p_in_stock, false) or cb.available > 0)
       and (p_min_rating is null or cb.rating_avg >= p_min_rating)
       and (not coalesce(p_on_sale, false) or cb.compare_at is not null)
  ),
  fl as (
    select a.id as attribute_id, f.val
      from jsonb_each(coalesce(p_filters, '{}'::jsonb)) as f(code, val)
      join public.attributes a on a.code = f.code and a.is_filterable
     where jsonb_typeof(f.val) <> 'array' or jsonb_array_length(f.val) > 0
  ),
  failed as (
    select b.product_id
      from base b cross join fl
     where not exists (
       select 1 from public.product_attribute_values pav
         left join public.attribute_values av on av.id = pav.value_id
        where pav.product_id = b.product_id and pav.attribute_id = fl.attribute_id
          and case jsonb_typeof(fl.val)
                when 'array' then av.slug in (select jsonb_array_elements_text(fl.val))
                when 'object' then pav.value_number between coalesce((fl.val ->> 'min')::numeric, -1e15)
                                                        and coalesce((fl.val ->> 'max')::numeric, 1e15)
                when 'boolean' then pav.value_boolean = (fl.val #>> '{}')::boolean
                else false end)
     group by b.product_id
  ),
  ordered as (
    select b.product_id, count(*) over () as total,
           row_number() over (order by
             case when p_sort = 'price_asc' then b.min_price end asc nulls last,
             case when p_sort = 'price_desc' then b.min_price end desc nulls last,
             case when p_sort = 'newest' then b.published_at end desc nulls last,
             case when p_sort = 'bestselling' then b.sold_count end desc nulls last,
             case when p_sort = 'rating' then b.rating_avg end desc nulls last,
             case when p_sort = 'rating' then b.rating_count end desc nulls last,
             case when p_sort = 'discount' and b.compare_at is not null
                  then (b.compare_at - b.min_price)::numeric / b.compare_at end desc nulls last,
             case when v_has_query then b.score end desc nulls last,
             b.is_featured desc, b.sold_count desc, b.rating_avg desc, b.published_at desc nulls last, b.product_id
           ) as rn
      from base b
     where not exists (select 1 from failed f where f.product_id = b.product_id)
  )
  select coalesce(max(o.total), 0)::int,
         coalesce(array_agg(o.product_id order by o.rn)
                  filter (where o.rn > (v_page - 1) * v_per and o.rn <= v_page * v_per), '{}')
    into v_total, v_ids
    from ordered o;

  return jsonb_build_object(
    'total', v_total, 'page', v_page, 'per_page', v_per,
    'items', public.product_cards(v_ids, p_market));
end $$;

-- Fasety: počty hodnot ignorují vlastní filtr dané vlastnosti (disjunktivní fasetování)
create or replace function public.catalog_facets(
  p_market public.market_code,
  p_category_path text default null,
  p_brand_slug text default null,
  p_query text default null,
  p_brands text[] default '{}',
  p_filters jsonb default '{}'::jsonb,
  p_price_min bigint default null,
  p_price_max bigint default null,
  p_in_stock boolean default false,
  p_min_rating numeric default null,
  p_on_sale boolean default false
) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  v_loc text := public.market_locale(p_market);
  v_cat_attr uuid[];
  v_result jsonb;
begin
  if p_category_path is not null then
    select array_agg(distinct ca.attribute_id) into v_cat_attr
      from public.category_attributes ca
      join public.categories c on c.id = ca.category_id
     where p_category_path = c.path or p_category_path like c.path || '/%' or c.path like p_category_path || '/%';
  end if;

  with base as (
    select * from public.catalog_base(p_market, p_category_path, p_brand_slug, p_query)
  ),
  scoped as (
    select * from base b
     where (p_price_min is null or b.min_price >= p_price_min)
       and (p_price_max is null or b.min_price <= p_price_max)
       and (not coalesce(p_in_stock, false) or b.available > 0)
       and (p_min_rating is null or b.rating_avg >= p_min_rating)
       and (not coalesce(p_on_sale, false) or b.compare_at is not null)
  ),
  fl as (
    select a.id as attribute_id, f.val
      from jsonb_each(coalesce(p_filters, '{}'::jsonb)) as f(code, val)
      join public.attributes a on a.code = f.code and a.is_filterable
     where jsonb_typeof(f.val) <> 'array' or jsonb_array_length(f.val) > 0
  ),
  failed as (
    select s.product_id, array_agg(fl.attribute_id) as failed_attrs
      from scoped s cross join fl
     where not exists (
       select 1 from public.product_attribute_values pav
         left join public.attribute_values av on av.id = pav.value_id
        where pav.product_id = s.product_id and pav.attribute_id = fl.attribute_id
          and case jsonb_typeof(fl.val)
                when 'array' then av.slug in (select jsonb_array_elements_text(fl.val))
                when 'object' then pav.value_number between coalesce((fl.val ->> 'min')::numeric, -1e15)
                                                        and coalesce((fl.val ->> 'max')::numeric, 1e15)
                when 'boolean' then pav.value_boolean = (fl.val #>> '{}')::boolean
                else false end)
     group by s.product_id
  ),
  prod as (
    select s.product_id, s.brand_id, s.available, s.compare_at,
           (coalesce(cardinality(p_brands), 0) = 0 or s.brand_slug = any(p_brands)) as brand_ok,
           coalesce(f.failed_attrs, '{}'::uuid[]) as failed_attrs
      from scoped s left join failed f on f.product_id = s.product_id
  ),
  attr_values as (
    select a.id as attribute_id, av.id as value_id, av.slug, av.value, av.color_hex, av.sort_order, av.translations,
           count(distinct pr.product_id)::int as cnt
      from prod pr
      join public.product_attribute_values pav on pav.product_id = pr.product_id
      join public.attributes a on a.id = pav.attribute_id and a.is_filterable and a.type in ('select', 'multiselect')
      join public.attribute_values av on av.id = pav.value_id
     where pr.brand_ok
       and (cardinality(pr.failed_attrs) = 0 or pr.failed_attrs = array[a.id])
       and (v_cat_attr is null or a.id = any(v_cat_attr))
     group by a.id, av.id
  ),
  attr_ranges as (
    select a.id as attribute_id, min(pav.value_number) as min_value, max(pav.value_number) as max_value
      from prod pr
      join public.product_attribute_values pav on pav.product_id = pr.product_id
      join public.attributes a on a.id = pav.attribute_id and a.is_filterable and a.type = 'number'
     where pr.brand_ok
       and (cardinality(pr.failed_attrs) = 0 or pr.failed_attrs = array[a.id])
       and (v_cat_attr is null or a.id = any(v_cat_attr))
       and pav.value_number is not null
     group by a.id
  ),
  attrs as (
    select a.sort_order, a.name, jsonb_build_object(
             'code', a.code,
             'name', public.tr(a.translations, v_loc, 'name', a.name),
             'type', a.type,
             'unit', a.unit,
             'values', coalesce((
               select jsonb_agg(jsonb_build_object(
                        'slug', v.slug,
                        'label', public.tr(v.translations, v_loc, 'value', v.value),
                        'color', v.color_hex,
                        'count', v.cnt) order by v.sort_order, v.value)
                 from attr_values v where v.attribute_id = a.id), '[]'::jsonb),
             'range', (select jsonb_build_object('min', r.min_value, 'max', r.max_value)
                         from attr_ranges r where r.attribute_id = a.id)
           ) as obj
      from public.attributes a
     where a.id in (select attribute_id from attr_values union select attribute_id from attr_ranges)
  )
  select jsonb_build_object(
    'total', (select count(*) from prod where brand_ok and cardinality(failed_attrs) = 0),
    'price', (select jsonb_build_object('min', min(min_price), 'max', max(min_price)) from base),
    'in_stock_count', (select count(*) from prod where brand_ok and cardinality(failed_attrs) = 0 and available > 0),
    'on_sale_count', (select count(*) from prod where brand_ok and cardinality(failed_attrs) = 0 and compare_at is not null),
    'brands', coalesce((
      select jsonb_agg(jsonb_build_object('slug', br.slug, 'name', br.name, 'count', x.cnt) order by br.name)
        from (select pr.brand_id, count(*)::int as cnt from prod pr
               where cardinality(pr.failed_attrs) = 0 and pr.brand_id is not null group by pr.brand_id) x
        join public.brands br on br.id = x.brand_id and br.is_active), '[]'::jsonb),
    'attributes', coalesce((select jsonb_agg(obj order by sort_order, name) from attrs), '[]'::jsonb)
  ) into v_result;
  return v_result;
end $$;

-- Detail produktu včetně variant, dostupnosti, parametrů, recenzí a doporučení
create or replace function public.catalog_product(p_slug text, p_market public.market_code)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  v_p public.products;
  v_loc text := public.market_locale(p_market);
  v_currency public.currency_code;
  v_alt_market public.market_code;
  v_alt_currency public.currency_code;
  v_related uuid[];
  v_result jsonb;
begin
  select * into v_p from public.products where slug = p_slug and is_active;
  if not found then return null; end if;
  select currency into v_currency from public.markets where code = p_market;
  select code, currency into v_alt_market, v_alt_currency
    from public.markets where code <> p_market and is_active order by sort_order limit 1;

  v_related := array(
    select r.related_product_id from public.product_relations r
     where r.product_id = v_p.id and r.relation = 'related' order by r.sort_order);
  if cardinality(v_related) = 0 then
    v_related := array(
      select p2.id from public.products p2
       where p2.is_active and p2.id <> v_p.id
         and (p2.primary_category_id = v_p.primary_category_id
              or exists (select 1 from public.categories c1, public.categories c2
                          where c1.id = p2.primary_category_id and c2.id = v_p.primary_category_id
                            and split_part(c1.path, '/', 1) = split_part(c2.path, '/', 1)))
       order by (p2.primary_category_id = v_p.primary_category_id) desc, p2.sold_count desc, p2.rating_avg desc
       limit 8);
  end if;

  select jsonb_build_object(
    'product', jsonb_build_object(
      'id', v_p.id,
      'slug', v_p.slug,
      'name', public.tr(v_p.translations, v_loc, 'name', v_p.name),
      'subtitle', public.tr(v_p.translations, v_loc, 'subtitle', v_p.subtitle),
      'short_description', public.tr(v_p.translations, v_loc, 'short_description', v_p.short_description),
      'description', public.tr(v_p.translations, v_loc, 'description', v_p.description),
      'package_contents', public.tr(v_p.translations, v_loc, 'package_contents', v_p.package_contents),
      'badge', v_p.badge,
      'video_url', v_p.video_url,
      'warranty_months', v_p.warranty_months,
      'weight_grams', v_p.weight_grams,
      'length_mm', v_p.length_mm, 'width_mm', v_p.width_mm, 'height_mm', v_p.height_mm,
      'seo_title', public.tr(v_p.translations, v_loc, 'seo_title', v_p.seo_title),
      'seo_description', public.tr(v_p.translations, v_loc, 'seo_description', v_p.seo_description),
      'rating_avg', v_p.rating_avg,
      'rating_count', v_p.rating_count,
      'primary_category_id', v_p.primary_category_id,
      'updated_at', v_p.updated_at),
    'currency', v_currency,
    'alt_currency', v_alt_currency,
    'brand', (select jsonb_build_object('name', b.name, 'slug', b.slug)
                from public.brands b where b.id = v_p.brand_id and b.is_active),
    'breadcrumbs', coalesce((
      select jsonb_agg(jsonb_build_object('name', public.tr(c.translations, v_loc, 'name', c.name), 'path', c.path)
                       order by c.depth)
        from public.categories c, public.categories pc
       where pc.id = v_p.primary_category_id and c.is_active
         and (pc.path = c.path or pc.path like c.path || '/%')), '[]'::jsonb),
    'images', coalesce((
      select jsonb_agg(jsonb_build_object('id', i.id, 'url', i.url, 'alt', coalesce(nullif(i.alt, ''), v_p.name),
                                          'width', i.width, 'height', i.height) order by i.sort_order, i.created_at)
        from public.product_images i where i.product_id = v_p.id), '[]'::jsonb),
    'variants', coalesce((
      select jsonb_agg(jsonb_build_object(
               'id', v.id, 'sku', v.sku, 'ean', v.ean, 'name', v.name, 'options', v.options,
               'image_id', v.image_id, 'is_default', v.is_default,
               'price', pp.price, 'compare_at', pp.compare_at_price,
               'lowest_30d', case when pp.compare_at_price is not null then public.lowest_price_30d(v.id, p_market) end,
               'alt_price', ap.price,
               'available', greatest(coalesce(i.quantity_on_hand, 0) - coalesce(i.quantity_reserved, 0), 0),
               'stock', public.stock_state(greatest(coalesce(i.quantity_on_hand, 0) - coalesce(i.quantity_reserved, 0), 0),
                                           coalesce(i.allow_backorder, false), coalesce(i.low_stock_threshold, 5)),
               'restock_date', i.restock_date)
             order by v.is_default desc, v.sort_order, pp.price)
        from public.product_variants v
        join public.product_prices pp on pp.variant_id = v.id and pp.market = p_market
        left join public.product_prices ap on ap.variant_id = v.id and ap.market = v_alt_market
        left join public.inventory i on i.variant_id = v.id
       where v.product_id = v_p.id and v.is_active), '[]'::jsonb),
    'attributes', coalesce((
      select jsonb_agg(x.obj order by x.sort_order, x.name) from (
        select a.sort_order, a.name, jsonb_build_object(
                 'code', a.code,
                 'name', public.tr(a.translations, v_loc, 'name', a.name),
                 'unit', a.unit,
                 'comparable', a.is_comparable,
                 'value', string_agg(coalesce(
                    public.tr(av.translations, v_loc, 'value', av.value),
                    replace(trim_scale(pav.value_number)::text, '.', ','),
                    pav.value_text,
                    case when pav.value_boolean then case v_loc when 'sk' then 'Áno' else 'Ano' end
                         when not pav.value_boolean then case v_loc when 'sk' then 'Nie' else 'Ne' end end),
                    ', ' order by av.sort_order)) as obj
          from public.product_attribute_values pav
          join public.attributes a on a.id = pav.attribute_id
          left join public.attribute_values av on av.id = pav.value_id
         where pav.product_id = v_p.id
         group by a.id) x), '[]'::jsonb),
    'reviews', jsonb_build_object(
      'avg', v_p.rating_avg,
      'count', v_p.rating_count,
      'distribution', coalesce((
        select jsonb_object_agg(r.rating::text, r.cnt)
          from (select rating, count(*)::int as cnt from public.reviews
                 where product_id = v_p.id and status = 'approved' group by rating) r), '{}'::jsonb),
      'items', coalesce((
        select jsonb_agg(jsonb_build_object(
                 'id', r.id, 'author_name', r.author_name, 'author_city', r.author_city, 'rating', r.rating,
                 'title', r.title, 'body', r.body, 'pros', r.pros, 'cons', r.cons,
                 'verified', r.is_verified_purchase, 'admin_reply', r.admin_reply, 'published_at', r.published_at)
               order by r.published_at desc)
          from (select * from public.reviews where product_id = v_p.id and status = 'approved'
                 order by published_at desc limit 20) r), '[]'::jsonb)),
    'relations', jsonb_build_object(
      'related', public.product_cards(v_related, p_market),
      'alternative', public.product_cards(array(
        select r.related_product_id from public.product_relations r
         where r.product_id = v_p.id and r.relation in ('alternative', 'upsell') order by r.sort_order), p_market),
      'accessory', public.product_cards(array(
        select r.related_product_id from public.product_relations r
         where r.product_id = v_p.id and r.relation in ('accessory', 'cross_sell') order by r.sort_order), p_market),
      'bought_together', public.product_cards(array(
        select oi2.product_id
          from public.order_items oi1
          join public.orders o on o.id = oi1.order_id and o.status in ('paid', 'processing', 'ready_to_ship', 'shipped', 'delivered')
          join public.order_items oi2 on oi2.order_id = oi1.order_id and oi2.product_id <> oi1.product_id
         where oi1.product_id = v_p.id and oi2.product_id is not null
         group by oi2.product_id order by count(*) desc limit 6), p_market)),
    'delivery', (
      select jsonb_build_object(
               'days_min', min(sm.delivery_days_min),
               'days_max', min(sm.delivery_days_max),
               'price_from', min(smm.price),
               'free_from', (select free_shipping_threshold from public.markets where code = p_market))
        from public.shipping_methods sm
        join public.shipping_method_markets smm on smm.method_id = sm.id and smm.market = p_market and smm.is_active
       -- odhad doručení a „doprava od“ počítáme z přepravců (osobní odběr by zkresloval)
       where sm.is_active and sm.type <> 'store_pickup')
  ) into v_result;
  return v_result;
end $$;

-- Našeptávač: produkty, kategorie, značky (diakritika i překlepy)
create or replace function public.search_suggest(p_query text, p_market public.market_code, p_limit integer default 6)
returns jsonb language plpgsql stable security definer
set search_path = ''
set pg_trgm.word_similarity_threshold = 0.45
as $$
declare
  v_q text := nullif(public.search_normalize(left(p_query, 100)), '');
  v_loc text := public.market_locale(p_market);
  v_ids uuid[];
begin
  if v_q is null or char_length(v_q) < 2 then
    return jsonb_build_object('products', '[]'::jsonb, 'categories', '[]'::jsonb, 'brands', '[]'::jsonb);
  end if;
  v_ids := array(
    select cb.product_id from public.catalog_base(p_market, null, null, p_query) cb
     order by cb.score desc, cb.sold_count desc limit least(greatest(p_limit, 1), 10));
  return jsonb_build_object(
    'products', public.product_cards(v_ids, p_market),
    'categories', coalesce((
      select jsonb_agg(jsonb_build_object('name', x.name, 'path', x.path) order by x.sml desc, x.depth)
        from (select public.tr(c.translations, v_loc, 'name', c.name) as name, c.path, c.depth,
                     extensions.word_similarity(v_q, public.search_normalize(c.name)) as sml
                from public.categories c
               where c.is_active
                 and (public.search_normalize(c.name) like '%' || v_q || '%'
                      or v_q operator(extensions.<%) public.search_normalize(c.name))
               order by sml desc, c.depth limit 4) x), '[]'::jsonb),
    'brands', coalesce((
      select jsonb_agg(jsonb_build_object('name', x.name, 'slug', x.slug) order by x.sml desc)
        from (select b.name, b.slug, extensions.word_similarity(v_q, public.search_normalize(b.name)) as sml
                from public.brands b
               where b.is_active
                 and (public.search_normalize(b.name) like '%' || v_q || '%'
                      or v_q operator(extensions.<%) public.search_normalize(b.name))
               order by sml desc limit 4) x), '[]'::jsonb));
end $$;

-- Navigace: aktivní kategorie (plochý seznam, strom se skládá na serveru)
create or replace function public.storefront_categories(p_market public.market_code)
returns jsonb language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(jsonb_build_object(
           'id', c.id, 'parent_id', c.parent_id, 'slug', c.slug, 'path', c.path, 'depth', c.depth,
           'name', public.tr(c.translations, public.market_locale(p_market), 'name', c.name),
           'description', public.tr(c.translations, public.market_locale(p_market), 'description', c.description),
           'image_url', c.image_url, 'banner_url', c.banner_url, 'show_in_menu', c.show_in_menu,
           'seo_title', public.tr(c.translations, public.market_locale(p_market), 'seo_title', c.seo_title),
           'seo_description', public.tr(c.translations, public.market_locale(p_market), 'seo_description', c.seo_description),
           'updated_at', c.updated_at)
         order by c.depth, c.sort_order, c.name), '[]'::jsonb)
    from public.categories c
   where c.is_active
     and not exists (select 1 from public.categories anc
                      where anc.is_active = false and c.path like anc.path || '/%')
$$;

-- Homepage: všechny sekce (pořadí a obsah řídí administrace) v jednom volání
create or replace function public.storefront_home(p_market public.market_code)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  v_loc text := public.market_locale(p_market);
  v_sections jsonb := '[]'::jsonb;
  s record;
  v_data jsonb;
  v_limit integer;
  v_ids uuid[];
begin
  for s in select * from public.homepage_sections where is_active order by sort_order loop
    v_data := null;
    if s.type in ('hero', 'promo') then
      select coalesce(jsonb_agg(jsonb_build_object(
               'id', b.id,
               'eyebrow', public.tr(b.translations, v_loc, 'eyebrow', b.eyebrow),
               'title', public.tr(b.translations, v_loc, 'title', b.title),
               'title_highlight', public.tr(b.translations, v_loc, 'title_highlight', b.title_highlight),
               'subtitle', public.tr(b.translations, v_loc, 'subtitle', b.subtitle),
               'cta_label', public.tr(b.translations, v_loc, 'cta_label', b.cta_label),
               'cta_href', b.cta_href,
               'image_url', b.image_url,
               'image_alt', public.tr(b.translations, v_loc, 'image_alt', b.image_alt),
               'image_position', b.image_position,
               'annotation', public.tr(b.translations, v_loc, 'annotation', b.annotation),
               'badge_text', public.tr(b.translations, v_loc, 'badge_text', b.badge_text),
               'layout', b.layout) order by b.sort_order), '[]'::jsonb)
        into v_data
        from public.banners b
       where b.is_active
         and b.placement = (case s.type when 'hero' then 'hero' else 'promo' end)::public.banner_placement
         and p_market = any(b.markets)
         and (b.starts_at is null or b.starts_at <= now())
         and (b.ends_at is null or b.ends_at > now());
    elsif s.type = 'categories' then
      select coalesce(jsonb_agg(jsonb_build_object(
               'id', c.id, 'name', public.tr(c.translations, v_loc, 'name', c.name),
               'path', c.path, 'image_url', c.image_url) order by c.sort_order), '[]'::jsonb)
        into v_data
        from public.categories c
       where c.is_active and c.parent_id is null and c.show_in_menu;
    elsif s.type = 'products' then
      v_limit := least(greatest(coalesce((s.config ->> 'limit')::int, 8), 1), 24);
      case coalesce(s.config ->> 'source', 'bestsellers')
        when 'manual' then
          v_ids := array(select (e)::uuid from jsonb_array_elements_text(coalesce(s.config -> 'product_ids', '[]'::jsonb)) e);
        when 'new' then
          v_ids := array(select cb.product_id from public.catalog_base(p_market, null, null, null) cb
                          order by cb.published_at desc nulls last limit v_limit);
        when 'sale' then
          v_ids := array(select cb.product_id from public.catalog_base(p_market, null, null, null) cb
                          where cb.compare_at is not null
                          order by (cb.compare_at - cb.min_price)::numeric / cb.compare_at desc limit v_limit);
        when 'featured' then
          v_ids := array(select cb.product_id from public.catalog_base(p_market, null, null, null) cb
                          where cb.is_featured order by cb.sold_count desc limit v_limit);
        when 'category' then
          v_ids := array(select cb.product_id from public.catalog_base(p_market, s.config ->> 'category_path', null, null) cb
                          order by cb.sold_count desc, cb.rating_avg desc limit v_limit);
        else
          v_ids := array(select cb.product_id from public.catalog_base(p_market, null, null, null) cb
                          order by cb.sold_count desc, cb.rating_count desc, cb.rating_avg desc limit v_limit);
      end case;
      v_data := public.product_cards(v_ids[1:v_limit], p_market);
    elsif s.type = 'reviews' then
      select jsonb_build_object(
               'avg', coalesce(round(avg(r.rating)::numeric, 1), 0),
               'count', count(*),
               'verified_count', count(*) filter (where r.is_verified_purchase),
               'items', coalesce((
                 select jsonb_agg(jsonb_build_object(
                          'id', x.id, 'author_name', x.author_name, 'author_city', x.author_city,
                          'rating', x.rating, 'body', x.body, 'verified', x.is_verified_purchase,
                          'product_slug', x.slug, 'product_name', x.pname) order by x.ord)
                   from (select rv.id, rv.author_name, rv.author_city, rv.rating, rv.body, rv.is_verified_purchase,
                                p.slug, p.name as pname,
                                row_number() over (order by rv.is_verified_purchase desc, rv.rating desc, rv.published_at desc) as ord
                           from public.reviews rv join public.products p on p.id = rv.product_id and p.is_active
                          where rv.status = 'approved' and rv.rating >= 4 and char_length(rv.body) <= 220
                          order by ord limit least(greatest(coalesce((s.config ->> 'limit')::int, 3), 1), 12)) x), '[]'::jsonb))
        into v_data
        from public.reviews r
       where r.status = 'approved';
    end if;
    v_sections := v_sections || jsonb_build_array(jsonb_build_object(
      'key', s.key,
      'type', s.type,
      'title', public.tr(s.translations, v_loc, 'title', s.title),
      'subtitle', public.tr(s.translations, v_loc, 'subtitle', s.subtitle),
      'config', s.config || coalesce(s.translations -> v_loc -> 'config', '{}'::jsonb),
      'data', v_data));
  end loop;
  return jsonb_build_object('sections', v_sections);
end $$;

-- Porovnání produktů: karty + porovnatelné parametry
create or replace function public.catalog_compare(p_ids uuid[], p_market public.market_code)
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'products', public.product_cards(p_ids[1:4], p_market),
    'attributes', coalesce((
      select jsonb_agg(jsonb_build_object('code', x.code, 'name', x.name, 'unit', x.unit, 'values', x.vals)
                       order by x.sort_order, x.name)
        from (
          select a.code, public.tr(a.translations, public.market_locale(p_market), 'name', a.name) as name,
                 a.unit, a.sort_order,
                 jsonb_object_agg(v.product_id, v.val) as vals
            from (
              select pav.product_id, pav.attribute_id,
                     string_agg(coalesce(public.tr(av.translations, public.market_locale(p_market), 'value', av.value),
                                         replace(trim_scale(pav.value_number)::text, '.', ','), pav.value_text,
                                         case when pav.value_boolean then '✓' when not pav.value_boolean then '–' end),
                                ', ' order by av.sort_order) as val
                from public.product_attribute_values pav
                left join public.attribute_values av on av.id = pav.value_id
               where pav.product_id = any(p_ids[1:4])
               group by pav.product_id, pav.attribute_id) v
            join public.attributes a on a.id = v.attribute_id and a.is_comparable
           group by a.id) x), '[]'::jsonb))
$$;
