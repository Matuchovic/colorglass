-- =============================================================================
-- COLOR 0001 · Základ: rozšíření, pomocné funkce, výčty, trhy, DPH, RBAC, profily
-- Konvence: ceny v nejmenších jednotkách měny (haléře / centy) jako bigint.
-- SECURITY DEFINER funkce mají vždy prázdný search_path a plně kvalifikované názvy.
-- =============================================================================

create extension if not exists pg_trgm with schema extensions;
create extension if not exists unaccent with schema extensions;
create extension if not exists pgcrypto with schema extensions;

-- Nové funkce nejsou implicitně spustitelné z API; práva se udělují explicitně.
alter default privileges in schema public revoke execute on functions from public;
alter default privileges in schema public revoke execute on functions from anon, authenticated;

-- -----------------------------------------------------------------------------
-- Pomocné funkce
-- -----------------------------------------------------------------------------
create or replace function public.set_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end $$;

create or replace function public.immutable_unaccent(text) returns text
language sql immutable parallel safe strict set search_path = '' as $$
  select extensions.unaccent('extensions.unaccent'::regdictionary, $1)
$$;

-- Normalizace pro vyhledávání: bez diakritiky, malá písmena, jednotné mezery
create or replace function public.search_normalize(text) returns text
language sql immutable parallel safe set search_path = '' as $$
  select btrim(regexp_replace(lower(public.immutable_unaccent(coalesce($1, ''))), '\s+', ' ', 'g'))
$$;

create or replace function public.slugify(text) returns text
language sql immutable parallel safe set search_path = '' as $$
  select btrim(regexp_replace(public.search_normalize($1), '[^a-z0-9]+', '-', 'g'), '-')
$$;

-- -----------------------------------------------------------------------------
-- Výčty
-- -----------------------------------------------------------------------------
create type public.app_role as enum ('customer', 'support', 'warehouse', 'manager', 'admin', 'superadmin');
create type public.market_code as enum ('CZ', 'SK');
create type public.currency_code as enum ('CZK', 'EUR');
create type public.order_status as enum (
  'new', 'awaiting_payment', 'paid', 'processing', 'ready_to_ship',
  'shipped', 'delivered', 'cancelled', 'returned', 'complaint'
);
create type public.payment_status as enum (
  'pending', 'authorized', 'paid', 'failed', 'cancelled', 'expired', 'refunded', 'partially_refunded'
);
create type public.payment_provider as enum ('bank_transfer', 'cod', 'stripe', 'comgate', 'gopay');
create type public.shipping_type as enum ('address', 'pickup_point', 'store_pickup');
create type public.shipment_status as enum (
  'pending', 'label_created', 'handed_over', 'in_transit', 'ready_for_pickup', 'delivered', 'returned', 'cancelled'
);
create type public.discount_type as enum ('percentage', 'fixed_amount', 'free_shipping');
create type public.review_status as enum ('pending', 'approved', 'hidden');
create type public.newsletter_status as enum ('pending', 'confirmed', 'unsubscribed');
create type public.inventory_reason as enum (
  'initial', 'purchase', 'adjustment', 'reservation', 'reservation_release', 'sale', 'return', 'damage', 'import'
);
create type public.return_type as enum ('return', 'complaint');
create type public.return_status as enum ('requested', 'approved', 'received', 'refunded', 'rejected', 'resolved');
create type public.attribute_type as enum ('select', 'multiselect', 'number', 'boolean', 'text');
create type public.banner_placement as enum ('hero', 'promo');

-- -----------------------------------------------------------------------------
-- Trhy, DPH, nastavení
-- -----------------------------------------------------------------------------
create table public.markets (
  code public.market_code primary key,
  name text not null,
  currency public.currency_code not null,
  locale text not null,
  free_shipping_threshold bigint check (free_shipping_threshold is null or free_shipping_threshold >= 0),
  is_active boolean not null default true,
  sort_order integer not null default 0,
  updated_at timestamptz not null default now()
);
create trigger markets_updated before update on public.markets for each row execute function public.set_updated_at();

create table public.tax_classes (
  code text primary key check (code ~ '^[a-z_]+$'),
  name text not null
);

create table public.tax_rates (
  tax_class text not null references public.tax_classes(code) on update cascade,
  market public.market_code not null references public.markets(code),
  rate_bps integer not null check (rate_bps between 0 and 10000),
  primary key (tax_class, market)
);

create table public.store_settings (
  key text primary key check (key ~ '^[a-z0-9_.]+$'),
  value jsonb not null,
  is_public boolean not null default false,
  description text,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null
);
create trigger store_settings_updated before update on public.store_settings for each row execute function public.set_updated_at();

create or replace function public.setting(p_key text) returns jsonb
language sql stable security definer set search_path = '' as $$
  select value from public.store_settings where key = p_key
$$;

-- -----------------------------------------------------------------------------
-- Role a oprávnění (RBAC). Zdroj pravdy je databáze.
-- -----------------------------------------------------------------------------
create table public.role_permissions (
  role public.app_role not null,
  permission text not null check (permission ~ '^([a-z_]+\.[a-z_]+|\*)$'),
  primary key (role, permission)
);

insert into public.role_permissions (role, permission) values
  ('support', 'catalog.read'), ('support', 'orders.read'), ('support', 'orders.write'),
  ('support', 'customers.read'), ('support', 'reviews.moderate'), ('support', 'returns.manage'),
  ('support', 'notifications.read'), ('support', 'contact.read'),
  ('warehouse', 'catalog.read'), ('warehouse', 'orders.read'), ('warehouse', 'orders.fulfill'),
  ('warehouse', 'inventory.read'), ('warehouse', 'inventory.write'), ('warehouse', 'returns.manage'),
  ('warehouse', 'notifications.read'),
  ('manager', 'catalog.read'), ('manager', 'catalog.write'), ('manager', 'orders.read'),
  ('manager', 'orders.write'), ('manager', 'orders.fulfill'), ('manager', 'orders.export'),
  ('manager', 'payments.refund'), ('manager', 'customers.read'), ('manager', 'customers.write'),
  ('manager', 'inventory.read'), ('manager', 'inventory.write'), ('manager', 'content.write'),
  ('manager', 'reviews.moderate'), ('manager', 'discounts.read'), ('manager', 'discounts.write'),
  ('manager', 'returns.manage'), ('manager', 'import.run'), ('manager', 'analytics.read'),
  ('manager', 'notifications.read'), ('manager', 'contact.read'), ('manager', 'audit.read'),
  ('admin', '*'),
  ('superadmin', '*');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  first_name text check (char_length(first_name) <= 80),
  last_name text check (char_length(last_name) <= 80),
  phone text check (char_length(phone) <= 32),
  company_name text check (char_length(company_name) <= 160),
  company_id text check (company_id ~ '^[0-9]{6,10}$'),
  vat_id text check (vat_id ~ '^[A-Z]{2}[0-9A-Z]{6,12}$'),
  role public.app_role not null default 'customer',
  preferred_market public.market_code not null default 'CZ',
  is_blocked boolean not null default false,
  blocked_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index profiles_email_idx on public.profiles (lower(email));
create index profiles_staff_idx on public.profiles (role) where role <> 'customer';
create index profiles_search_idx on public.profiles
  using gin (public.search_normalize(coalesce(first_name, '') || ' ' || coalesce(last_name, '') || ' ' || email) extensions.gin_trgm_ops);
create trigger profiles_updated before update on public.profiles for each row execute function public.set_updated_at();

-- Rychlé kontroly oprávnění (volají se z RLS politik – obalujte je do (select ...))
create or replace function public.current_app_role() returns public.app_role
language sql stable security definer set search_path = '' as $$
  select coalesce(
    (select p.role from public.profiles p where p.id = (select auth.uid()) and not p.is_blocked),
    'customer'::public.app_role)
$$;

create or replace function public.has_perm(p_permission text) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1
    from public.profiles p
    join public.role_permissions rp on rp.role = p.role
    where p.id = (select auth.uid())
      and not p.is_blocked
      and (rp.permission = p_permission or rp.permission = '*')
  )
$$;

create or replace function public.is_staff() returns boolean
language sql stable security definer set search_path = '' as $$
  select public.current_app_role() <> 'customer'::public.app_role
$$;

create or replace function public.my_permissions() returns text[]
language sql stable security definer set search_path = '' as $$
  select coalesce(array_agg(rp.permission order by rp.permission), '{}')
  from public.profiles p
  join public.role_permissions rp on rp.role = p.role
  where p.id = (select auth.uid()) and not p.is_blocked
$$;

-- Zákazník nesmí měnit roli ani blokaci (sloupcová práva + pojistka v triggeru)
create or replace function public.profiles_guard() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if (new.role is distinct from old.role or new.is_blocked is distinct from old.is_blocked
      or new.blocked_reason is distinct from old.blocked_reason or new.email is distinct from old.email)
     and coalesce(current_setting('lena.internal', true), '') <> 'on'
     and (select auth.uid()) is not null then
    raise exception 'FORBIDDEN_PROFILE_FIELDS' using errcode = '42501';
  end if;
  return new;
end $$;
create trigger profiles_guard before update on public.profiles for each row execute function public.profiles_guard();

-- Změna role jen přes tuto funkci; superadmina může jmenovat pouze superadmin.
create or replace function public.admin_set_user_role(p_user_id uuid, p_role public.app_role) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_actor_role public.app_role := public.current_app_role();
begin
  if not public.has_perm('users.manage_roles') then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;
  if (p_role = 'superadmin' or exists (select 1 from public.profiles where id = p_user_id and role = 'superadmin'))
     and v_actor_role <> 'superadmin' then
    raise exception 'FORBIDDEN_SUPERADMIN' using errcode = '42501';
  end if;
  if p_user_id = (select auth.uid()) then
    raise exception 'CANNOT_CHANGE_OWN_ROLE' using errcode = '42501';
  end if;
  perform set_config('lena.internal', 'on', true);
  update public.profiles set role = p_role where id = p_user_id;
  if not found then raise exception 'NOT_FOUND' using errcode = 'P0002'; end if;
end $$;

create or replace function public.admin_set_user_blocked(p_user_id uuid, p_blocked boolean, p_reason text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.has_perm('customers.write') then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;
  if p_user_id = (select auth.uid()) then
    raise exception 'CANNOT_BLOCK_SELF' using errcode = '42501';
  end if;
  if exists (select 1 from public.profiles where id = p_user_id and role <> 'customer')
     and not public.has_perm('users.manage_roles') then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;
  perform set_config('lena.internal', 'on', true);
  update public.profiles
     set is_blocked = p_blocked, blocked_reason = case when p_blocked then left(p_reason, 500) end
   where id = p_user_id;
  if not found then raise exception 'NOT_FOUND' using errcode = 'P0002'; end if;
end $$;

-- Profil se zakládá automaticky při registraci
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, email, first_name, last_name)
  values (
    new.id,
    lower(new.email),
    nullif(left(new.raw_user_meta_data ->> 'first_name', 80), ''),
    nullif(left(new.raw_user_meta_data ->> 'last_name', 80), '')
  )
  on conflict (id) do nothing;
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

create or replace function public.handle_user_email_change() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.email is distinct from old.email then
    perform set_config('lena.internal', 'on', true);
    update public.profiles set email = lower(new.email) where id = new.id;
  end if;
  return new;
end $$;
create trigger on_auth_user_email_changed after update of email on auth.users for each row execute function public.handle_user_email_change();

create table public.addresses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  label text check (char_length(label) <= 60),
  first_name text not null check (char_length(first_name) between 1 and 80),
  last_name text not null check (char_length(last_name) between 1 and 80),
  company text check (char_length(company) <= 160),
  street text not null check (char_length(street) between 2 and 160),
  city text not null check (char_length(city) between 1 and 80),
  postal_code text not null check (postal_code ~ '^[0-9]{3} ?[0-9]{2}$'),
  country public.market_code not null default 'CZ',
  phone text check (char_length(phone) <= 32),
  is_default_shipping boolean not null default false,
  is_default_billing boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index addresses_user_idx on public.addresses (user_id);
create unique index addresses_one_default_shipping on public.addresses (user_id) where is_default_shipping;
create unique index addresses_one_default_billing on public.addresses (user_id) where is_default_billing;
create trigger addresses_updated before update on public.addresses for each row execute function public.set_updated_at();

create or replace function public.addresses_limit() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if (select count(*) from public.addresses where user_id = new.user_id) >= 20 then
    raise exception 'ADDRESS_LIMIT' using errcode = '23514';
  end if;
  return new;
end $$;
create trigger addresses_limit before insert on public.addresses for each row execute function public.addresses_limit();

-- -----------------------------------------------------------------------------
-- Audit log (zapisují triggery a funkce, nikdy klient)
-- -----------------------------------------------------------------------------
create table public.audit_logs (
  id bigint generated always as identity primary key,
  actor_id uuid references auth.users(id) on delete set null,
  action text not null,
  entity text not null,
  entity_id text,
  before jsonb,
  after jsonb,
  context jsonb,
  created_at timestamptz not null default now()
);
create index audit_logs_entity_idx on public.audit_logs (entity, entity_id, created_at desc);
create index audit_logs_actor_idx on public.audit_logs (actor_id, created_at desc);
create index audit_logs_created_idx on public.audit_logs (created_at desc);

-- Generický audit trigger; ukládá jen změněné sloupce a vynechává citlivá pole.
create or replace function public.audit_row() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_before jsonb;
  v_after jsonb;
  v_id text;
  v_key text;
  v_row jsonb;
begin
  if tg_op in ('UPDATE', 'DELETE') then v_before := to_jsonb(old) - 'search_text' - 'updated_at'; end if;
  if tg_op in ('UPDATE', 'INSERT') then v_after := to_jsonb(new) - 'search_text' - 'updated_at'; end if;
  if tg_op = 'UPDATE' then
    for v_key in select jsonb_object_keys(v_after) loop
      if v_before -> v_key = v_after -> v_key then
        v_before := v_before - v_key;
        v_after := v_after - v_key;
      end if;
    end loop;
    if v_after = '{}'::jsonb then return new; end if;
  end if;
  v_row := case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end;
  v_id := coalesce(v_row ->> 'id', v_row ->> 'variant_id', v_row ->> 'key', v_row ->> 'slug',
                   v_row ->> 'method_id', v_row ->> 'method_code', v_row ->> 'code');
  insert into public.audit_logs (actor_id, action, entity, entity_id, before, after)
  values ((select auth.uid()), lower(tg_op), tg_table_name, v_id, v_before, v_after);
  return coalesce(new, old);
end $$;

create or replace function public.log_admin_action(p_action text, p_entity text, p_entity_id text, p_context jsonb default null)
returns void language sql security definer set search_path = '' as $$
  insert into public.audit_logs (actor_id, action, entity, entity_id, context)
  values ((select auth.uid()), p_action, p_entity, p_entity_id, p_context)
$$;

create trigger audit_profiles after update of role, is_blocked on public.profiles for each row execute function public.audit_row();
create trigger audit_store_settings after insert or update or delete on public.store_settings for each row execute function public.audit_row();
create trigger audit_tax_rates after insert or update or delete on public.tax_rates for each row execute function public.audit_row();
create trigger audit_markets after update on public.markets for each row execute function public.audit_row();

-- -----------------------------------------------------------------------------
-- Rate limiting (fixní okno, atomický upsert; volá jen server se service role)
-- -----------------------------------------------------------------------------
create table public.rate_limits (
  key text not null,
  window_start timestamptz not null,
  hits integer not null default 0,
  primary key (key, window_start)
);
create index rate_limits_window_idx on public.rate_limits (window_start);

create or replace function public.rate_limit_hit(p_key text, p_limit integer, p_window_seconds integer)
returns boolean language plpgsql security definer set search_path = '' as $$
declare
  v_window timestamptz := to_timestamp(floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds);
  v_hits integer;
begin
  insert into public.rate_limits as r (key, window_start, hits)
  values (left(p_key, 200), v_window, 1)
  on conflict (key, window_start) do update set hits = r.hits + 1
  returning hits into v_hits;
  return v_hits <= p_limit;
end $$;
