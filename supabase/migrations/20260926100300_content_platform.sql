-- =============================================================================
-- COLOR 0004 · Obsah a platforma: bannery, sekce homepage, stránky, newsletter,
-- kontakty, notifikace, e-mailová fronta (outbox), importy, poznámky k zákazníkům
-- =============================================================================

create table public.banners (
  id uuid primary key default gen_random_uuid(),
  placement public.banner_placement not null,
  eyebrow text check (char_length(eyebrow) <= 80),
  title text not null check (char_length(title) between 2 and 120),
  title_highlight text check (char_length(title_highlight) <= 120),
  subtitle text check (char_length(subtitle) <= 300),
  cta_label text check (char_length(cta_label) <= 40),
  cta_href text check (cta_href ~ '^/[^/]'),
  image_url text not null check (image_url ~ '^(/|https://)'),
  image_alt text not null default '' check (char_length(image_alt) <= 200),
  image_position text not null default 'right' check (image_position in ('left', 'center', 'right')),
  annotation text check (char_length(annotation) <= 60),
  badge_text text check (char_length(badge_text) <= 40),
  layout text not null default 'photo' check (layout in ('photo', 'product')),
  markets public.market_code[] not null default '{CZ,SK}',
  starts_at timestamptz,
  ends_at timestamptz,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  translations jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index banners_live_idx on public.banners (placement, sort_order) where is_active;
create trigger banners_updated before update on public.banners for each row execute function public.set_updated_at();

create table public.homepage_sections (
  id uuid primary key default gen_random_uuid(),
  key text not null unique check (key ~ '^[a-z0-9_]+$'),
  type text not null check (type in ('hero', 'categories', 'products', 'benefits', 'promo', 'reviews', 'newsletter')),
  title text check (char_length(title) <= 120),
  subtitle text check (char_length(subtitle) <= 300),
  config jsonb not null default '{}'::jsonb check (jsonb_typeof(config) = 'object'),
  is_active boolean not null default true,
  sort_order integer not null default 0,
  translations jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
create trigger homepage_sections_updated before update on public.homepage_sections for each row execute function public.set_updated_at();

-- Informační a právní stránky (obsah spravuje provozovatel v administraci)
create table public.content_pages (
  slug text primary key check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  title text not null check (char_length(title) between 2 and 160),
  body text not null default '' check (char_length(body) <= 100000),
  seo_description text check (char_length(seo_description) <= 320),
  requires_legal_review boolean not null default false,
  footer_group text check (footer_group in ('shopping', 'service', 'about', 'legal')),
  sort_order integer not null default 0,
  is_active boolean not null default true,
  translations jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null
);
create trigger content_pages_updated before update on public.content_pages for each row execute function public.set_updated_at();

create table public.newsletter_subscribers (
  id uuid primary key default gen_random_uuid(),
  email text not null check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  status public.newsletter_status not null default 'pending',
  user_id uuid references auth.users(id) on delete set null,
  market public.market_code not null default 'CZ',
  locale text not null default 'cs',
  source text not null default 'web' check (char_length(source) <= 40),
  consent_text text not null,
  consent_at timestamptz not null default now(),
  confirm_token_hash text,
  confirm_sent_at timestamptz,
  confirmed_at timestamptz,
  unsubscribe_token_hash text,
  unsubscribed_at timestamptz,
  ip_hash text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index newsletter_email_idx on public.newsletter_subscribers (lower(email));
create index newsletter_confirm_idx on public.newsletter_subscribers (confirm_token_hash) where confirm_token_hash is not null;
create index newsletter_unsub_idx on public.newsletter_subscribers (unsubscribe_token_hash) where unsubscribe_token_hash is not null;
create trigger newsletter_updated before update on public.newsletter_subscribers for each row execute function public.set_updated_at();

create table public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 100),
  email text not null check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  order_number text check (order_number ~ '^[0-9]{10}$'),
  subject text not null check (char_length(subject) between 2 and 160),
  message text not null check (char_length(message) between 10 and 5000),
  status text not null default 'new' check (status in ('new', 'in_progress', 'closed')),
  ip_hash text,
  created_at timestamptz not null default now()
);
create index contact_messages_status_idx on public.contact_messages (status, created_at desc);

create table public.customer_notes (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references auth.users(id) on delete cascade,
  author_id uuid references auth.users(id) on delete set null,
  body text not null check (char_length(body) between 1 and 4000),
  created_at timestamptz not null default now()
);
create index customer_notes_customer_idx on public.customer_notes (customer_id, created_at desc);

-- -----------------------------------------------------------------------------
-- Notifikace pro administraci (cílené podle oprávnění)
-- -----------------------------------------------------------------------------
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('order_new', 'payment_failed', 'low_stock', 'review_new', 'return_new', 'complaint_new', 'contact_new', 'import_done')),
  title text not null,
  body text,
  link text check (link ~ '^/admin'),
  permission text not null,
  entity text,
  entity_id text,
  created_at timestamptz not null default now()
);
create index notifications_created_idx on public.notifications (created_at desc);

create table public.notification_reads (
  notification_id uuid not null references public.notifications(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  read_at timestamptz not null default now(),
  primary key (notification_id, user_id)
);

create or replace function public.notify_staff(
  p_type text, p_title text, p_body text, p_link text, p_permission text, p_entity text, p_entity_id text
) returns void language sql security definer set search_path = '' as $$
  insert into public.notifications (type, title, body, link, permission, entity, entity_id)
  values (p_type, p_title, p_body, p_link, p_permission, p_entity, p_entity_id)
$$;

create or replace function public.notify_low_stock() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_available_new integer := new.quantity_on_hand - new.quantity_reserved;
  v_available_old integer := old.quantity_on_hand - old.quantity_reserved;
  v_label text;
begin
  if not new.allow_backorder and v_available_new <= new.low_stock_threshold and v_available_old > old.low_stock_threshold then
    select p.name || coalesce(' – ' || v.name, '') || ' (' || v.sku || ')' into v_label
      from public.product_variants v join public.products p on p.id = v.product_id where v.id = new.variant_id;
    perform public.notify_staff('low_stock', 'Nízký stav skladu',
      coalesce(v_label, new.variant_id::text) || ': dostupné ' || greatest(v_available_new, 0) || ' ks',
      '/admin/sklad?nizky=1', 'inventory.read', 'variant', new.variant_id::text);
  end if;
  return null;
end $$;
create trigger inventory_low_stock_notify after update on public.inventory
  for each row execute function public.notify_low_stock();

create or replace function public.notify_entity_created() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if tg_table_name = 'orders' then
    perform public.notify_staff('order_new', 'Nová objednávka ' || new.number,
      new.email || ' · ' || (new.grand_total / 100.0)::text || ' ' || new.currency::text,
      '/admin/objednavky/' || new.id, 'orders.read', 'order', new.id::text);
  elsif tg_table_name = 'reviews' then
    if new.status = 'pending' then
      perform public.notify_staff('review_new', 'Nová recenze ke schválení', left(new.body, 140),
        '/admin/recenze?stav=pending', 'reviews.moderate', 'review', new.id::text);
    end if;
  elsif tg_table_name = 'return_requests' then
    perform public.notify_staff(
      case when new.type = 'complaint' then 'complaint_new' else 'return_new' end,
      case when new.type = 'complaint' then 'Nová reklamace' else 'Nová žádost o vrácení' end,
      left(new.reason, 140), '/admin/vratky/' || new.id, 'returns.manage', 'return', new.id::text);
  elsif tg_table_name = 'contact_messages' then
    perform public.notify_staff('contact_new', 'Nová zpráva: ' || new.subject, new.email,
      '/admin/zpravy', 'contact.read', 'contact', new.id::text);
  end if;
  return null;
end $$;
create trigger orders_notify after insert on public.orders for each row execute function public.notify_entity_created();
create trigger reviews_notify after insert on public.reviews for each row execute function public.notify_entity_created();
create trigger returns_notify after insert on public.return_requests for each row execute function public.notify_entity_created();
create trigger contact_notify after insert on public.contact_messages for each row execute function public.notify_entity_created();

-- -----------------------------------------------------------------------------
-- E-mailová fronta (transactional outbox) – deduplikace přes dedupe_key
-- -----------------------------------------------------------------------------
create table public.email_outbox (
  id uuid primary key default gen_random_uuid(),
  template text not null,
  to_email text not null,
  locale text not null default 'cs',
  payload jsonb not null default '{}'::jsonb,
  dedupe_key text not null unique,
  status text not null default 'pending' check (status in ('pending', 'sending', 'sent', 'failed')),
  attempts integer not null default 0,
  last_error text,
  provider_message_id text,
  next_attempt_at timestamptz not null default now(),
  sent_at timestamptz,
  created_at timestamptz not null default now()
);
create index email_outbox_queue_idx on public.email_outbox (next_attempt_at) where status in ('pending', 'failed');

create or replace function public.enqueue_email(p_template text, p_to text, p_locale text, p_payload jsonb, p_dedupe_key text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_id uuid;
begin
  insert into public.email_outbox (template, to_email, locale, payload, dedupe_key)
  values (p_template, lower(p_to), coalesce(p_locale, 'cs'), coalesce(p_payload, '{}'::jsonb), p_dedupe_key)
  on conflict (dedupe_key) do nothing
  returning id into v_id;
  return v_id;
end $$;

-- Atomicky vyzvedne dávku e-mailů k odeslání (bez duplicit při souběžných workerech)
create or replace function public.claim_email_batch(p_limit integer)
returns setof public.email_outbox language plpgsql security definer set search_path = '' as $$
begin
  return query
  update public.email_outbox e
     set status = 'sending', attempts = e.attempts + 1, next_attempt_at = now()
   where e.id in (
     select id from public.email_outbox
      where attempts < 6
        and ((status in ('pending', 'failed') and next_attempt_at <= now())
             -- zaseknuté odesílání (pád workeru) se po 10 minutách zkusí znovu
             or (status = 'sending' and next_attempt_at < now() - interval '10 minutes'))
      order by created_at
      for update skip locked
      limit p_limit)
  returning e.*;
end $$;

create or replace function public.complete_email(p_id uuid, p_ok boolean, p_error text, p_provider_id text)
returns void language sql security definer set search_path = '' as $$
  update public.email_outbox
     set status = case when p_ok then 'sent' else 'failed' end,
         sent_at = case when p_ok then now() end,
         last_error = case when p_ok then null else left(p_error, 500) end,
         provider_message_id = p_provider_id,
         next_attempt_at = now() + make_interval(mins => power(2, least(attempts, 6))::int)
   where id = p_id
$$;

create table public.import_jobs (
  id uuid primary key default gen_random_uuid(),
  type text not null default 'products' check (type in ('products')),
  status text not null default 'running' check (status in ('running', 'completed', 'failed')),
  filename text,
  total_rows integer not null default 0,
  created_rows integer not null default 0,
  updated_rows integer not null default 0,
  error_rows integer not null default 0,
  errors jsonb not null default '[]'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  finished_at timestamptz
);

create trigger audit_banners after insert or update or delete on public.banners for each row execute function public.audit_row();
create trigger audit_homepage_sections after insert or update or delete on public.homepage_sections for each row execute function public.audit_row();
create trigger audit_content_pages after insert or update or delete on public.content_pages for each row execute function public.audit_row();
