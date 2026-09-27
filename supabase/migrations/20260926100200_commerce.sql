-- =============================================================================
-- COLOR 0003 · Obchod: košík, oblíbené, doprava, platby, slevy, objednávky,
-- platby a jejich události, zásilky, refundace, vratky, doklady, recenze
-- =============================================================================

-- Košík: anonymní přes hash tokenu z httpOnly cookie, přihlášený přes user_id.
-- Přístup výhradně přes server (service role); klient nemá k tabulkám žádná práva.
create table public.carts (
  id uuid primary key default gen_random_uuid(),
  token_hash text unique check (char_length(token_hash) = 64),
  user_id uuid references auth.users(id) on delete cascade,
  market public.market_code not null default 'CZ',
  discount_code text check (char_length(discount_code) <= 64),
  status text not null default 'active' check (status in ('active', 'converted', 'merged')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index carts_one_active_per_user on public.carts (user_id) where status = 'active' and user_id is not null;
create index carts_updated_idx on public.carts (updated_at) where status = 'active';
create trigger carts_updated before update on public.carts for each row execute function public.set_updated_at();

create table public.cart_items (
  id uuid primary key default gen_random_uuid(),
  cart_id uuid not null references public.carts(id) on delete cascade,
  variant_id uuid not null references public.product_variants(id) on delete cascade,
  quantity integer not null check (quantity between 1 and 99),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (cart_id, variant_id)
);
create trigger cart_items_updated before update on public.cart_items for each row execute function public.set_updated_at();

create or replace function public.cart_items_limit() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if (select count(*) from public.cart_items where cart_id = new.cart_id) >= 50 then
    raise exception 'CART_LIMIT' using errcode = '23514';
  end if;
  return new;
end $$;
create trigger cart_items_limit before insert on public.cart_items for each row execute function public.cart_items_limit();

create table public.wishlists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null default 'Oblíbené' check (char_length(name) <= 80),
  is_default boolean not null default true,
  created_at timestamptz not null default now()
);
create unique index wishlists_one_default on public.wishlists (user_id) where is_default;

create table public.wishlist_items (
  wishlist_id uuid not null references public.wishlists(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  variant_id uuid references public.product_variants(id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (wishlist_id, product_id)
);
create index wishlist_items_product_idx on public.wishlist_items (product_id);

create table public.recently_viewed (
  user_id uuid not null references auth.users(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  viewed_at timestamptz not null default now(),
  primary key (user_id, product_id)
);
create index recently_viewed_user_idx on public.recently_viewed (user_id, viewed_at desc);

-- -----------------------------------------------------------------------------
-- Doprava a platby (ceny per trh)
-- -----------------------------------------------------------------------------
create table public.shipping_methods (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code ~ '^[a-z0-9_]+$'),
  carrier text not null check (carrier in ('packeta', 'ppl', 'dpd', 'gls', 'balikovna', 'ceska_posta', 'sps', 'slovenska_posta', 'store')),
  type public.shipping_type not null,
  name text not null,
  description text,
  delivery_days_min integer not null default 1 check (delivery_days_min >= 0),
  delivery_days_max integer not null default 2 check (delivery_days_max >= 0),
  max_weight_grams integer check (max_weight_grams > 0),
  cod_allowed boolean not null default true,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  translations jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (delivery_days_max >= delivery_days_min)
);
create trigger shipping_methods_updated before update on public.shipping_methods for each row execute function public.set_updated_at();

create table public.shipping_method_markets (
  method_id uuid not null references public.shipping_methods(id) on delete cascade,
  market public.market_code not null references public.markets(code),
  price bigint not null check (price >= 0),
  free_from bigint check (free_from is null or free_from >= 0),
  is_active boolean not null default true,
  primary key (method_id, market)
);

create table public.payment_methods (
  code text primary key check (code ~ '^[a-z0-9_]+$'),
  provider public.payment_provider not null,
  name text not null,
  description text,
  is_online boolean not null default false,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  translations jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
create trigger payment_methods_updated before update on public.payment_methods for each row execute function public.set_updated_at();

create table public.payment_method_markets (
  method_code text not null references public.payment_methods(code) on delete cascade on update cascade,
  market public.market_code not null references public.markets(code),
  fee bigint not null default 0 check (fee >= 0),
  is_active boolean not null default true,
  primary key (method_code, market)
);

-- -----------------------------------------------------------------------------
-- Slevy: pravidlo (discounts) + kódy (discount_codes). Výpočet výhradně na serveru.
-- -----------------------------------------------------------------------------
create table public.discounts (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 120),
  type public.discount_type not null,
  percent_bps integer check (percent_bps between 1 and 10000),
  amount_czk bigint check (amount_czk > 0),
  amount_eur bigint check (amount_eur > 0),
  min_subtotal_czk bigint check (min_subtotal_czk >= 0),
  min_subtotal_eur bigint check (min_subtotal_eur >= 0),
  applies_to text not null default 'all' check (applies_to in ('all', 'products', 'categories', 'brands')),
  markets public.market_code[] not null default '{CZ,SK}',
  starts_at timestamptz,
  ends_at timestamptz,
  usage_limit integer check (usage_limit > 0),
  usage_limit_per_customer integer check (usage_limit_per_customer > 0),
  times_used integer not null default 0 check (times_used >= 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (type <> 'percentage' or percent_bps is not null),
  check (type <> 'fixed_amount' or (amount_czk is not null or amount_eur is not null)),
  check (usage_limit is null or times_used <= usage_limit),
  check (ends_at is null or starts_at is null or ends_at > starts_at)
);
create trigger discounts_updated before update on public.discounts for each row execute function public.set_updated_at();

create table public.discount_targets (
  discount_id uuid not null references public.discounts(id) on delete cascade,
  target_type text not null check (target_type in ('product', 'category', 'brand')),
  target_id uuid not null,
  primary key (discount_id, target_type, target_id)
);

create table public.discount_codes (
  id uuid primary key default gen_random_uuid(),
  discount_id uuid not null references public.discounts(id) on delete cascade,
  code text not null check (code ~ '^[A-Z0-9_-]{3,40}$'),
  usage_limit integer check (usage_limit > 0),
  times_used integer not null default 0 check (times_used >= 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  check (usage_limit is null or times_used <= usage_limit)
);
create unique index discount_codes_code_idx on public.discount_codes (upper(code));

-- -----------------------------------------------------------------------------
-- Objednávky
-- -----------------------------------------------------------------------------
create sequence public.order_number_seq start 1;

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  number text not null unique check (number ~ '^[0-9]{10}$'),
  user_id uuid references auth.users(id) on delete set null,
  email text not null check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  phone text check (char_length(phone) <= 32),
  market public.market_code not null,
  currency public.currency_code not null,
  locale text not null default 'cs',
  status public.order_status not null default 'new',
  payment_status public.payment_status not null default 'pending',
  subtotal bigint not null check (subtotal >= 0),
  discount_total bigint not null default 0 check (discount_total >= 0),
  shipping_total bigint not null default 0 check (shipping_total >= 0),
  payment_fee_total bigint not null default 0 check (payment_fee_total >= 0),
  tax_total bigint not null default 0 check (tax_total >= 0),
  grand_total bigint not null check (grand_total >= 0),
  vat_breakdown jsonb not null default '[]'::jsonb,
  discount_id uuid references public.discounts(id) on delete set null,
  discount_code_id uuid references public.discount_codes(id) on delete set null,
  discount_code text,
  shipping_method_id uuid references public.shipping_methods(id) on delete set null,
  shipping_method_name text not null,
  shipping_carrier text not null,
  shipping_type public.shipping_type not null,
  pickup_point jsonb,
  payment_method_code text not null,
  payment_method_name text not null,
  payment_provider public.payment_provider not null,
  customer_note text check (char_length(customer_note) <= 1000),
  is_business boolean not null default false,
  terms_accepted_at timestamptz not null,
  terms_version text not null,
  marketing_consent boolean not null default false,
  idempotency_key text not null unique check (char_length(idempotency_key) between 16 and 100),
  access_token_hash text not null check (char_length(access_token_hash) = 64),
  ip_hash text,
  reservation_expires_at timestamptz,
  paid_at timestamptz,
  shipped_at timestamptz,
  delivered_at timestamptz,
  cancelled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (grand_total = subtotal - discount_total + shipping_total + payment_fee_total)
);
create index orders_user_idx on public.orders (user_id, created_at desc);
create index orders_email_idx on public.orders (lower(email));
create index orders_status_idx on public.orders (status, created_at desc);
create index orders_created_idx on public.orders (created_at desc);
create index orders_reservation_idx on public.orders (reservation_expires_at) where status = 'awaiting_payment';
create trigger orders_updated before update on public.orders for each row execute function public.set_updated_at();

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  variant_id uuid references public.product_variants(id) on delete set null,
  sku text not null,
  name text not null,
  variant_name text,
  image_url text,
  quantity integer not null check (quantity > 0),
  unit_price bigint not null check (unit_price >= 0),
  unit_compare_at bigint,
  discount_amount bigint not null default 0 check (discount_amount >= 0),
  tax_rate_bps integer not null check (tax_rate_bps between 0 and 10000),
  tax_amount bigint not null check (tax_amount >= 0),
  line_total bigint not null check (line_total >= 0),
  created_at timestamptz not null default now(),
  check (line_total = unit_price * quantity - discount_amount)
);
create index order_items_order_idx on public.order_items (order_id);
create index order_items_product_idx on public.order_items (product_id);
create index order_items_variant_idx on public.order_items (variant_id);

alter table public.inventory_movements add constraint inventory_movements_order_fk
  foreign key (order_id) references public.orders(id) on delete set null;

create table public.order_addresses (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  type text not null check (type in ('billing', 'shipping')),
  first_name text not null,
  last_name text not null,
  company text,
  company_id text,
  vat_id text,
  street text not null,
  city text not null,
  postal_code text not null,
  country public.market_code not null,
  phone text,
  unique (order_id, type)
);

create table public.order_status_history (
  id bigint generated always as identity primary key,
  order_id uuid not null references public.orders(id) on delete cascade,
  from_status public.order_status,
  to_status public.order_status not null,
  actor_id uuid references auth.users(id) on delete set null,
  note text check (char_length(note) <= 1000),
  created_at timestamptz not null default now()
);
create index order_status_history_order_idx on public.order_status_history (order_id, created_at);

create table public.order_notes (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  author_id uuid references auth.users(id) on delete set null,
  body text not null check (char_length(body) between 1 and 4000),
  created_at timestamptz not null default now()
);
create index order_notes_order_idx on public.order_notes (order_id, created_at);

create table public.discount_redemptions (
  id uuid primary key default gen_random_uuid(),
  discount_id uuid not null references public.discounts(id) on delete cascade,
  code_id uuid references public.discount_codes(id) on delete set null,
  order_id uuid not null unique references public.orders(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  email text not null,
  amount bigint not null,
  created_at timestamptz not null default now()
);
create index discount_redemptions_customer_idx on public.discount_redemptions (discount_id, lower(email));

-- -----------------------------------------------------------------------------
-- Platby: stav se mění jen serverově (webhook / ověření u brány), idempotentně
-- -----------------------------------------------------------------------------
create table public.payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  provider public.payment_provider not null,
  method_code text not null,
  status public.payment_status not null default 'pending',
  amount bigint not null check (amount >= 0),
  currency public.currency_code not null,
  provider_payment_id text,
  redirect_url text,
  refunded_amount bigint not null default 0 check (refunded_amount >= 0),
  failure_reason text,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (provider, provider_payment_id),
  check (refunded_amount <= amount)
);
create index payments_order_idx on public.payments (order_id);
create trigger payments_updated before update on public.payments for each row execute function public.set_updated_at();

create table public.payment_events (
  id bigint generated always as identity primary key,
  provider public.payment_provider not null,
  provider_event_id text not null,
  payment_id uuid references public.payments(id) on delete set null,
  event_type text not null,
  status public.payment_status,
  amount bigint,
  payload jsonb,
  result text,
  created_at timestamptz not null default now(),
  unique (provider, provider_event_id)
);
create index payment_events_payment_idx on public.payment_events (payment_id, created_at);

create table public.refunds (
  id uuid primary key default gen_random_uuid(),
  payment_id uuid not null references public.payments(id) on delete cascade,
  amount bigint not null check (amount > 0),
  status text not null default 'pending' check (status in ('pending', 'succeeded', 'failed', 'manual')),
  reason text check (char_length(reason) <= 500),
  provider_refund_id text,
  idempotency_key text not null unique,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger refunds_updated before update on public.refunds for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- Zásilky
-- -----------------------------------------------------------------------------
create table public.shipments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  carrier text not null,
  tracking_number text check (char_length(tracking_number) <= 64),
  tracking_url text check (tracking_url ~ '^https://'),
  status public.shipment_status not null default 'pending',
  provider_shipment_id text,
  label_url text,
  weight_grams integer,
  shipped_at timestamptz,
  delivered_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index shipments_order_idx on public.shipments (order_id);
create index shipments_tracking_idx on public.shipments (tracking_number);
create trigger shipments_updated before update on public.shipments for each row execute function public.set_updated_at();

create table public.shipment_events (
  id bigint generated always as identity primary key,
  shipment_id uuid not null references public.shipments(id) on delete cascade,
  status public.shipment_status not null,
  description text,
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create index shipment_events_shipment_idx on public.shipment_events (shipment_id, occurred_at);

-- -----------------------------------------------------------------------------
-- Vratky a reklamace, doklady
-- -----------------------------------------------------------------------------
create table public.return_requests (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  type public.return_type not null,
  status public.return_status not null default 'requested',
  items jsonb not null check (jsonb_typeof(items) = 'array' and jsonb_array_length(items) between 1 and 50),
  reason text not null check (char_length(reason) between 5 and 2000),
  bank_account text check (char_length(bank_account) <= 64),
  staff_note text check (char_length(staff_note) <= 2000),
  refund_amount bigint check (refund_amount >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index return_requests_order_idx on public.return_requests (order_id);
create index return_requests_status_idx on public.return_requests (status, created_at desc);
create trigger return_requests_updated before update on public.return_requests for each row execute function public.set_updated_at();

create table public.order_documents (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  type text not null check (type in ('invoice', 'credit_note', 'proforma', 'other')),
  number text,
  storage_path text,
  external_url text check (external_url ~ '^https://'),
  provider text,
  provider_id text,
  issued_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  check (storage_path is not null or external_url is not null)
);
create index order_documents_order_idx on public.order_documents (order_id);

-- -----------------------------------------------------------------------------
-- Recenze (ověřený nákup se počítá v DB, nikdy z klienta)
-- -----------------------------------------------------------------------------
create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  author_name text not null check (char_length(author_name) between 2 and 60),
  author_city text check (char_length(author_city) <= 60),
  rating smallint not null check (rating between 1 and 5),
  title text check (char_length(title) <= 120),
  body text not null check (char_length(body) between 10 and 4000),
  pros text check (char_length(pros) <= 1000),
  cons text check (char_length(cons) <= 1000),
  status public.review_status not null default 'pending',
  is_verified_purchase boolean not null default false,
  admin_reply text check (char_length(admin_reply) <= 2000),
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index reviews_one_per_user_product on public.reviews (product_id, user_id) where user_id is not null;
create index reviews_product_idx on public.reviews (product_id, status, published_at desc);
create index reviews_status_idx on public.reviews (status, created_at desc);
create trigger reviews_updated before update on public.reviews for each row execute function public.set_updated_at();

create or replace function public.reviews_guard() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := (select auth.uid());
  v_staff boolean := public.has_perm('reviews.moderate');
begin
  if tg_op = 'INSERT' then
    if v_uid is not null and not v_staff then
      new.user_id := v_uid;
      new.status := 'pending';
      new.admin_reply := null;
    end if;
    new.is_verified_purchase := new.user_id is not null and exists (
      select 1 from public.order_items oi
      join public.orders o on o.id = oi.order_id
      where o.user_id = new.user_id and oi.product_id = new.product_id
        and o.status in ('paid', 'processing', 'ready_to_ship', 'shipped', 'delivered'));
  else
    if v_uid is not null and not v_staff then
      if old.user_id is distinct from v_uid or old.status <> 'pending' then
        raise exception 'FORBIDDEN' using errcode = '42501';
      end if;
      new.status := 'pending';
      new.user_id := old.user_id;
      new.admin_reply := old.admin_reply;
      new.product_id := old.product_id;
    end if;
    new.is_verified_purchase := old.is_verified_purchase;
  end if;
  if new.status = 'approved' and new.published_at is null then new.published_at := now(); end if;
  return new;
end $$;
create trigger reviews_guard before insert or update on public.reviews for each row execute function public.reviews_guard();

create or replace function public.reviews_aggregate() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_product uuid := coalesce(new.product_id, old.product_id);
begin
  update public.products p
     set rating_avg = coalesce(s.avg, 0), rating_count = coalesce(s.cnt, 0)
    from (select round(avg(rating)::numeric, 2) as avg, count(*)::int as cnt
            from public.reviews where product_id = v_product and status = 'approved') s
   where p.id = v_product;
  return null;
end $$;
create trigger reviews_aggregate after insert or update of status, rating or delete on public.reviews
  for each row execute function public.reviews_aggregate();

create trigger audit_orders after update of status, payment_status on public.orders for each row execute function public.audit_row();
create trigger audit_discounts after insert or update or delete on public.discounts for each row execute function public.audit_row();
create trigger audit_discount_codes after insert or update or delete on public.discount_codes for each row execute function public.audit_row();
create trigger audit_shipping_markets after insert or update or delete on public.shipping_method_markets for each row execute function public.audit_row();
create trigger audit_payment_markets after insert or update or delete on public.payment_method_markets for each row execute function public.audit_row();
create trigger audit_reviews after update of status or delete on public.reviews for each row execute function public.audit_row();
create trigger audit_refunds after insert or update on public.refunds for each row execute function public.audit_row();
