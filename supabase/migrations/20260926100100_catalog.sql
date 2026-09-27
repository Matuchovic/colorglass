-- =============================================================================
-- COLOR 0002 · Katalog: značky, stromové kategorie, produkty, varianty, ceny
-- (vč. historie pro 30denní nejnižší cenu), obrázky, parametry, sklad
-- =============================================================================

create table public.brands (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name text not null check (char_length(name) between 1 and 120),
  description text,
  logo_url text,
  seo_title text check (char_length(seo_title) <= 120),
  seo_description text check (char_length(seo_description) <= 320),
  is_active boolean not null default true,
  translations jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index brands_name_trgm on public.brands using gin (public.search_normalize(name) extensions.gin_trgm_ops);
create trigger brands_updated before update on public.brands for each row execute function public.set_updated_at();

-- Neomezený strom: materializovaná cesta slugů (elektronika/sluchatka)
create table public.categories (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid references public.categories(id) on delete restrict,
  slug text not null check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  path text not null unique,
  depth integer not null default 0,
  name text not null check (char_length(name) between 1 and 120),
  description text,
  image_url text,
  banner_url text,
  seo_title text check (char_length(seo_title) <= 120),
  seo_description text check (char_length(seo_description) <= 320),
  is_active boolean not null default true,
  show_in_menu boolean not null default true,
  sort_order integer not null default 0,
  translations jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index categories_sibling_slug on public.categories (coalesce(parent_id, '00000000-0000-0000-0000-000000000000'::uuid), slug);
create index categories_parent_idx on public.categories (parent_id, sort_order);
create index categories_path_prefix on public.categories (path text_pattern_ops);
create index categories_name_trgm on public.categories using gin (public.search_normalize(name) extensions.gin_trgm_ops);
create trigger categories_updated before update on public.categories for each row execute function public.set_updated_at();

create or replace function public.categories_tree_before() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_parent public.categories;
begin
  if new.parent_id is null then
    new.path := new.slug;
    new.depth := 0;
  else
    select * into v_parent from public.categories where id = new.parent_id;
    if not found then raise exception 'PARENT_NOT_FOUND' using errcode = '23503'; end if;
    if tg_op = 'UPDATE' and (v_parent.id = new.id or v_parent.path like old.path || '/%') then
      raise exception 'CATEGORY_CYCLE' using errcode = '23514';
    end if;
    new.path := v_parent.path || '/' || new.slug;
    new.depth := v_parent.depth + 1;
  end if;
  return new;
end $$;
create trigger categories_tree_before before insert or update of slug, parent_id on public.categories
  for each row execute function public.categories_tree_before();

-- Po změně cesty přepočítá cesty potomků
create or replace function public.categories_tree_after() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.path is distinct from old.path then
    update public.categories
       set path = new.path || substr(path, char_length(old.path) + 1),
           depth = depth + (new.depth - old.depth)
     where path like old.path || '/%';
  end if;
  return null;
end $$;
create trigger categories_tree_after after update of path on public.categories
  for each row when (pg_trigger_depth() = 1) execute function public.categories_tree_after();

create table public.products (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name text not null check (char_length(name) between 2 and 200),
  subtitle text check (char_length(subtitle) <= 200),
  brand_id uuid references public.brands(id) on delete set null,
  primary_category_id uuid references public.categories(id) on delete set null,
  short_description text check (char_length(short_description) <= 600),
  description text check (char_length(description) <= 40000),
  package_contents text check (char_length(package_contents) <= 4000),
  tax_class text not null default 'standard' references public.tax_classes(code) on update cascade,
  badge text check (badge in ('bestseller', 'new', 'tip')),
  is_active boolean not null default false,
  is_featured boolean not null default false,
  video_url text check (video_url ~ '^https://(www\.youtube\.com|youtu\.be|player\.vimeo\.com|vimeo\.com)/'),
  weight_grams integer check (weight_grams >= 0),
  length_mm integer check (length_mm >= 0),
  width_mm integer check (width_mm >= 0),
  height_mm integer check (height_mm >= 0),
  warranty_months integer check (warranty_months between 0 and 240),
  seo_title text check (char_length(seo_title) <= 120),
  seo_description text check (char_length(seo_description) <= 320),
  translations jsonb not null default '{}'::jsonb,
  search_text text not null default '',
  rating_avg numeric(3, 2) not null default 0,
  rating_count integer not null default 0,
  sold_count integer not null default 0,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index products_active_idx on public.products (is_active, published_at desc);
create index products_brand_idx on public.products (brand_id) where is_active;
create index products_category_idx on public.products (primary_category_id);
create index products_search_trgm on public.products using gin (search_text extensions.gin_trgm_ops);
create index products_sold_idx on public.products (sold_count desc) where is_active;
create trigger products_updated before update on public.products for each row execute function public.set_updated_at();

create or replace function public.products_before_write() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.is_active and new.published_at is null then new.published_at := now(); end if;
  new.search_text := public.search_normalize(concat_ws(' ',
    new.name, new.subtitle,
    (select b.name from public.brands b where b.id = new.brand_id),
    (select string_agg(v.sku || ' ' || coalesce(v.ean, ''), ' ') from public.product_variants v where v.product_id = new.id)));
  return new;
end $$;

create table public.product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  sku text not null unique check (sku ~ '^[A-Za-z0-9._/-]{2,64}$'),
  ean text unique check (ean ~ '^[0-9]{8,14}$'),
  name text check (char_length(name) <= 120),
  options jsonb not null default '{}'::jsonb check (jsonb_typeof(options) = 'object'),
  image_id uuid,
  weight_grams integer check (weight_grams >= 0),
  is_default boolean not null default false,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index product_variants_product_idx on public.product_variants (product_id, sort_order);
create unique index product_variants_one_default on public.product_variants (product_id) where is_default;
create trigger product_variants_updated before update on public.product_variants for each row execute function public.set_updated_at();

create trigger products_before_write before insert or update on public.products
  for each row execute function public.products_before_write();

-- Změna SKU/EAN varianty přepočítá vyhledávací text produktu
create or replace function public.variants_touch_product() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  update public.products set search_text = search_text where id = coalesce(new.product_id, old.product_id);
  return null;
end $$;
create trigger variants_touch_product after insert or delete or update of sku, ean on public.product_variants
  for each row execute function public.variants_touch_product();

create or replace function public.brands_touch_products() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.name is distinct from old.name then
    update public.products set search_text = search_text where brand_id = new.id;
  end if;
  return null;
end $$;
create trigger brands_touch_products after update of name on public.brands
  for each row execute function public.brands_touch_products();

-- Ceny jsou vždy s DPH, per trh (měna je daná trhem)
create table public.product_prices (
  variant_id uuid not null references public.product_variants(id) on delete cascade,
  market public.market_code not null references public.markets(code),
  price bigint not null check (price >= 0),
  compare_at_price bigint check (compare_at_price is null or compare_at_price > price),
  updated_at timestamptz not null default now(),
  primary key (variant_id, market)
);
create index product_prices_market_price on public.product_prices (market, price);
create trigger product_prices_updated before update on public.product_prices for each row execute function public.set_updated_at();

create table public.price_history (
  id bigint generated always as identity primary key,
  variant_id uuid not null references public.product_variants(id) on delete cascade,
  market public.market_code not null,
  price bigint not null,
  valid_from timestamptz not null default now()
);
create index price_history_lookup on public.price_history (variant_id, market, valid_from desc);

create or replace function public.product_prices_history() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' or new.price is distinct from old.price then
    insert into public.price_history (variant_id, market, price) values (new.variant_id, new.market, new.price);
  end if;
  return null;
end $$;
create trigger product_prices_history after insert or update of price on public.product_prices
  for each row execute function public.product_prices_history();

-- Nejnižší cena za 30 dní PŘED poslední změnou ceny (§ 12a zákona č. 634/1992 Sb., směrnice Omnibus).
-- Vrací null, pokud předchozí cena neexistuje (nový produkt).
create or replace function public.lowest_price_30d(p_variant_id uuid, p_market public.market_code) returns bigint
language sql stable security definer set search_path = '' as $$
  with cur as (
    select h.valid_from from public.price_history h
     where h.variant_id = p_variant_id and h.market = p_market
     order by h.valid_from desc limit 1
  )
  select min(s.price) from (
    select h.price from public.price_history h, cur
     where h.variant_id = p_variant_id and h.market = p_market
       and h.valid_from < cur.valid_from and h.valid_from >= cur.valid_from - interval '30 days'
    union all
    (select h.price from public.price_history h, cur
      where h.variant_id = p_variant_id and h.market = p_market
        and h.valid_from < cur.valid_from - interval '30 days'
      order by h.valid_from desc limit 1)
  ) s
$$;

create table public.product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  url text not null check (url ~ '^(/|https://)'),
  storage_path text,
  alt text check (char_length(alt) <= 200),
  width integer,
  height integer,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);
create index product_images_product_idx on public.product_images (product_id, sort_order);
alter table public.product_variants add constraint product_variants_image_fk
  foreign key (image_id) references public.product_images(id) on delete set null;

create table public.product_categories (
  product_id uuid not null references public.products(id) on delete cascade,
  category_id uuid not null references public.categories(id) on delete cascade,
  primary key (product_id, category_id)
);
create index product_categories_category_idx on public.product_categories (category_id, product_id);

create table public.product_relations (
  product_id uuid not null references public.products(id) on delete cascade,
  related_product_id uuid not null references public.products(id) on delete cascade,
  relation text not null check (relation in ('related', 'upsell', 'cross_sell', 'accessory', 'alternative')),
  sort_order integer not null default 0,
  primary key (product_id, related_product_id, relation),
  check (product_id <> related_product_id)
);

-- Parametry a filtry
create table public.attributes (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code ~ '^[a-z0-9_]+$'),
  name text not null,
  type public.attribute_type not null,
  unit text,
  is_filterable boolean not null default true,
  is_comparable boolean not null default true,
  sort_order integer not null default 0,
  translations jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table public.attribute_values (
  id uuid primary key default gen_random_uuid(),
  attribute_id uuid not null references public.attributes(id) on delete cascade,
  value text not null,
  slug text not null check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  color_hex text check (color_hex ~ '^#[0-9a-fA-F]{6}$'),
  sort_order integer not null default 0,
  translations jsonb not null default '{}'::jsonb,
  unique (attribute_id, slug)
);

create table public.product_attribute_values (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  attribute_id uuid not null references public.attributes(id) on delete cascade,
  value_id uuid references public.attribute_values(id) on delete cascade,
  value_number numeric,
  value_text text check (char_length(value_text) <= 500),
  value_boolean boolean,
  check (num_nonnulls(value_id, value_number, value_text, value_boolean) = 1)
);
create unique index pav_unique_value on public.product_attribute_values (product_id, attribute_id, value_id) where value_id is not null;
create unique index pav_unique_scalar on public.product_attribute_values (product_id, attribute_id) where value_id is null;
create index pav_value_idx on public.product_attribute_values (value_id, product_id);
create index pav_number_idx on public.product_attribute_values (attribute_id, value_number) where value_number is not null;

create or replace function public.pav_value_matches() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.value_id is not null and not exists (
    select 1 from public.attribute_values where id = new.value_id and attribute_id = new.attribute_id) then
    raise exception 'ATTRIBUTE_VALUE_MISMATCH' using errcode = '23514';
  end if;
  return new;
end $$;
create trigger pav_value_matches before insert or update on public.product_attribute_values
  for each row execute function public.pav_value_matches();

create table public.category_attributes (
  category_id uuid not null references public.categories(id) on delete cascade,
  attribute_id uuid not null references public.attributes(id) on delete cascade,
  sort_order integer not null default 0,
  primary key (category_id, attribute_id)
);

-- -----------------------------------------------------------------------------
-- Sklad: dostupné = on_hand - reserved. CHECK brání přeprodání i při chybě v kódu.
-- -----------------------------------------------------------------------------
create table public.inventory (
  variant_id uuid primary key references public.product_variants(id) on delete cascade,
  quantity_on_hand integer not null default 0 check (quantity_on_hand >= 0),
  quantity_reserved integer not null default 0 check (quantity_reserved >= 0),
  low_stock_threshold integer not null default 5 check (low_stock_threshold >= 0),
  allow_backorder boolean not null default false,
  restock_date date,
  updated_at timestamptz not null default now(),
  constraint inventory_no_oversell check (allow_backorder or quantity_reserved <= quantity_on_hand)
);
create index inventory_low_stock_idx on public.inventory ((quantity_on_hand - quantity_reserved)) where not allow_backorder;
create trigger inventory_updated before update on public.inventory for each row execute function public.set_updated_at();

create table public.inventory_movements (
  id bigint generated always as identity primary key,
  variant_id uuid not null references public.product_variants(id) on delete cascade,
  reason public.inventory_reason not null,
  on_hand_delta integer not null default 0,
  reserved_delta integer not null default 0,
  on_hand_after integer not null,
  reserved_after integer not null,
  order_id uuid,
  actor_id uuid references auth.users(id) on delete set null,
  note text check (char_length(note) <= 500),
  created_at timestamptz not null default now()
);
create index inventory_movements_variant_idx on public.inventory_movements (variant_id, created_at desc);
create index inventory_movements_order_idx on public.inventory_movements (order_id) where order_id is not null;
create index inventory_movements_created_idx on public.inventory_movements (created_at desc);

create or replace function public.product_variants_create_inventory() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.inventory (variant_id) values (new.id) on conflict do nothing;
  return null;
end $$;
create trigger product_variants_create_inventory after insert on public.product_variants
  for each row execute function public.product_variants_create_inventory();

-- Jediný vstupní bod pro pohyb skladu. Zamyká řádek, zapisuje pohyb.
create or replace function public.inventory_apply(
  p_variant_id uuid, p_on_hand_delta integer, p_reserved_delta integer,
  p_reason public.inventory_reason, p_order_id uuid, p_note text
) returns public.inventory
language plpgsql security definer set search_path = '' as $$
declare
  v_row public.inventory;
begin
  update public.inventory
     set quantity_on_hand = quantity_on_hand + p_on_hand_delta,
         quantity_reserved = quantity_reserved + p_reserved_delta
   where variant_id = p_variant_id
  returning * into v_row;
  if not found then raise exception 'INVENTORY_NOT_FOUND' using errcode = 'P0002'; end if;
  insert into public.inventory_movements
    (variant_id, reason, on_hand_delta, reserved_delta, on_hand_after, reserved_after, order_id, actor_id, note)
  values (p_variant_id, p_reason, p_on_hand_delta, p_reserved_delta, v_row.quantity_on_hand,
          v_row.quantity_reserved, p_order_id, (select auth.uid()), left(p_note, 500));
  return v_row;
end $$;

-- Ruční úprava skladu z administrace (naskladnění, inventura, poškození)
create or replace function public.admin_adjust_stock(
  p_variant_id uuid, p_delta integer, p_reason public.inventory_reason, p_note text
) returns public.inventory
language plpgsql security definer set search_path = '' as $$
begin
  if not public.has_perm('inventory.write') then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;
  if p_reason not in ('purchase', 'adjustment', 'damage', 'return', 'initial') then
    raise exception 'INVALID_REASON' using errcode = '22023';
  end if;
  if p_delta = 0 then raise exception 'ZERO_DELTA' using errcode = '22023'; end if;
  return public.inventory_apply(p_variant_id, p_delta, 0, p_reason, null, p_note);
exception
  when check_violation then
    raise exception 'STOCK_BELOW_RESERVED' using errcode = '23514';
end $$;

create or replace function public.admin_update_inventory_settings(
  p_variant_id uuid, p_low_stock_threshold integer, p_allow_backorder boolean, p_restock_date date
) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.has_perm('inventory.write') then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;
  update public.inventory
     set low_stock_threshold = greatest(p_low_stock_threshold, 0),
         allow_backorder = p_allow_backorder,
         restock_date = p_restock_date
   where variant_id = p_variant_id;
  if not found then raise exception 'NOT_FOUND' using errcode = 'P0002'; end if;
end $$;

-- Stav dostupnosti pro katalog
create or replace function public.stock_state(p_available integer, p_backorder boolean, p_threshold integer)
returns text language sql immutable parallel safe set search_path = '' as $$
  select case
    when p_available > p_threshold then 'in_stock'
    when p_available > 0 then 'low_stock'
    when p_backorder then 'backorder'
    else 'out_of_stock' end
$$;

create trigger audit_products after insert or update or delete on public.products for each row execute function public.audit_row();
create trigger audit_product_variants after insert or update or delete on public.product_variants for each row execute function public.audit_row();
create trigger audit_product_prices after insert or update or delete on public.product_prices for each row execute function public.audit_row();
create trigger audit_categories after insert or update or delete on public.categories for each row execute function public.audit_row();
create trigger audit_brands after insert or update or delete on public.brands for each row execute function public.audit_row();
create trigger audit_inventory_settings after update of low_stock_threshold, allow_backorder on public.inventory for each row execute function public.audit_row();
