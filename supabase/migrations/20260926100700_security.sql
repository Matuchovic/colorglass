-- =============================================================================
-- COLOR 0008 · Bezpečnost: RLS na všech tabulkách, minimální práva, práva k funkcím,
-- úložiště souborů. Zásada: klient smí jen to, co výslovně povolí politika.
-- =============================================================================

-- Zákazník si může zrušit vlastní nezaplacenou objednávku
create or replace function public.customer_cancel_order(p_order_id uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_order public.orders;
begin
  select * into v_order from public.orders where id = p_order_id and user_id = (select auth.uid()) for update;
  if not found then raise exception 'NOT_FOUND' using errcode = 'P0002'; end if;
  if v_order.status not in ('new', 'awaiting_payment') or v_order.payment_status in ('paid', 'authorized') then
    raise exception 'CANCEL_NOT_ALLOWED' using errcode = 'P0001';
  end if;
  perform set_config('color.system', 'on', true);
  return public.order_transition(p_order_id, 'cancelled', 'Zrušeno zákazníkem');
end $$;

-- order_transition: systémová volání (zákaznické storno) obchází kontrolu oprávnění pracovníka
create or replace function public.is_system_call() returns boolean
language sql stable set search_path = '' as $$
  select (select auth.uid()) is null or coalesce(current_setting('color.system', true), '') = 'on'
$$;

-- log_admin_action smí volat jen pracovník nebo server
create or replace function public.log_admin_action(p_action text, p_entity text, p_entity_id text, p_context jsonb default null)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if (select auth.uid()) is not null and not public.is_staff() then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;
  insert into public.audit_logs (actor_id, action, entity, entity_id, context)
  values ((select auth.uid()), left(p_action, 80), left(p_entity, 80), left(p_entity_id, 120), p_context);
end $$;

-- -----------------------------------------------------------------------------
-- RLS zapnuto všude; výchozí stav = žádný přístup
-- -----------------------------------------------------------------------------
do $$
declare t record;
begin
  for t in select tablename from pg_tables where schemaname = 'public' loop
    execute format('alter table public.%I enable row level security', t.tablename);
  end loop;
end $$;

revoke all on all tables in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;
grant usage on schema public to anon, authenticated;

-- -----------------------------------------------------------------------------
-- Veřejně čitelné (katalog, obsah, konfigurace)
-- -----------------------------------------------------------------------------
grant select on public.markets, public.tax_classes, public.tax_rates, public.store_settings,
  public.brands, public.categories, public.products, public.product_variants, public.product_prices,
  public.product_images, public.product_categories, public.product_relations, public.attributes,
  public.attribute_values, public.product_attribute_values, public.category_attributes,
  public.shipping_methods, public.shipping_method_markets, public.payment_methods, public.payment_method_markets,
  public.banners, public.homepage_sections, public.content_pages, public.reviews
  to anon, authenticated;

create policy markets_read on public.markets for select using (true);
create policy tax_classes_read on public.tax_classes for select using (true);
create policy tax_rates_read on public.tax_rates for select using (true);
create policy settings_read on public.store_settings for select using (is_public or (select public.has_perm('settings.write')));
create policy attributes_read on public.attributes for select using (true);
create policy attribute_values_read on public.attribute_values for select using (true);
create policy category_attributes_read on public.category_attributes for select using (true);

create policy brands_read on public.brands for select using (is_active or (select public.has_perm('catalog.read')));
create policy categories_read on public.categories for select using (is_active or (select public.has_perm('catalog.read')));
create policy products_read on public.products for select using (is_active or (select public.has_perm('catalog.read')));
create policy variants_read on public.product_variants for select using (
  (is_active and exists (select 1 from public.products p where p.id = product_id and p.is_active))
  or (select public.has_perm('catalog.read')));
create policy prices_read on public.product_prices for select using (
  exists (select 1 from public.product_variants v join public.products p on p.id = v.product_id
           where v.id = variant_id and v.is_active and p.is_active)
  or (select public.has_perm('catalog.read')));
create policy images_read on public.product_images for select using (
  exists (select 1 from public.products p where p.id = product_id and p.is_active) or (select public.has_perm('catalog.read')));
create policy product_categories_read on public.product_categories for select using (
  exists (select 1 from public.products p where p.id = product_id and p.is_active) or (select public.has_perm('catalog.read')));
create policy relations_read on public.product_relations for select using (
  exists (select 1 from public.products p where p.id = product_id and p.is_active) or (select public.has_perm('catalog.read')));
create policy pav_read on public.product_attribute_values for select using (
  exists (select 1 from public.products p where p.id = product_id and p.is_active) or (select public.has_perm('catalog.read')));

create policy shipping_methods_read on public.shipping_methods for select using (is_active or (select public.has_perm('settings.write')));
create policy shipping_markets_read on public.shipping_method_markets for select using (is_active or (select public.has_perm('settings.write')));
create policy payment_methods_read on public.payment_methods for select using (is_active or (select public.has_perm('settings.write')));
create policy payment_markets_read on public.payment_method_markets for select using (is_active or (select public.has_perm('settings.write')));

create policy banners_read on public.banners for select using (is_active or (select public.has_perm('content.write')));
create policy sections_read on public.homepage_sections for select using (is_active or (select public.has_perm('content.write')));
create policy pages_read on public.content_pages for select using (is_active or (select public.has_perm('content.write')));

create policy reviews_read on public.reviews for select using (
  status = 'approved' or user_id = (select auth.uid()) or (select public.has_perm('reviews.moderate')));

-- -----------------------------------------------------------------------------
-- Zápisy pracovníků (authenticated + oprávnění z RBAC)
-- -----------------------------------------------------------------------------
grant insert, update, delete on public.brands, public.categories, public.products, public.product_variants,
  public.product_prices, public.product_images, public.product_categories, public.product_relations,
  public.attributes, public.attribute_values, public.product_attribute_values, public.category_attributes
  to authenticated;

do $$
declare t text;
begin
  foreach t in array array['brands', 'categories', 'products', 'product_variants', 'product_prices', 'product_images',
                           'product_categories', 'product_relations', 'attributes', 'attribute_values',
                           'product_attribute_values', 'category_attributes'] loop
    execute format('create policy %I on public.%I for insert to authenticated with check ((select public.has_perm(''catalog.write'')))', t || '_insert', t);
    execute format('create policy %I on public.%I for update to authenticated using ((select public.has_perm(''catalog.write''))) with check ((select public.has_perm(''catalog.write'')))', t || '_update', t);
    execute format('create policy %I on public.%I for delete to authenticated using ((select public.has_perm(''catalog.write'')))', t || '_delete', t);
  end loop;

  foreach t in array array['markets', 'tax_rates', 'store_settings', 'shipping_methods', 'shipping_method_markets',
                           'payment_methods', 'payment_method_markets'] loop
    execute format('grant insert, update, delete on public.%I to authenticated', t);
    execute format('create policy %I on public.%I for insert to authenticated with check ((select public.has_perm(''settings.write'')))', t || '_insert', t);
    execute format('create policy %I on public.%I for update to authenticated using ((select public.has_perm(''settings.write''))) with check ((select public.has_perm(''settings.write'')))', t || '_update', t);
    execute format('create policy %I on public.%I for delete to authenticated using ((select public.has_perm(''settings.write'')))', t || '_delete', t);
  end loop;

  foreach t in array array['banners', 'homepage_sections', 'content_pages'] loop
    execute format('grant insert, update, delete on public.%I to authenticated', t);
    execute format('create policy %I on public.%I for insert to authenticated with check ((select public.has_perm(''content.write'')))', t || '_insert', t);
    execute format('create policy %I on public.%I for update to authenticated using ((select public.has_perm(''content.write''))) with check ((select public.has_perm(''content.write'')))', t || '_update', t);
    execute format('create policy %I on public.%I for delete to authenticated using ((select public.has_perm(''content.write'')))', t || '_delete', t);
  end loop;

  foreach t in array array['discounts', 'discount_targets', 'discount_codes'] loop
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
    execute format('create policy %I on public.%I for select to authenticated using ((select public.has_perm(''discounts.read'')) or (select public.has_perm(''discounts.write'')))', t || '_read', t);
    execute format('create policy %I on public.%I for insert to authenticated with check ((select public.has_perm(''discounts.write'')))', t || '_insert', t);
    execute format('create policy %I on public.%I for update to authenticated using ((select public.has_perm(''discounts.write''))) with check ((select public.has_perm(''discounts.write'')))', t || '_update', t);
    execute format('create policy %I on public.%I for delete to authenticated using ((select public.has_perm(''discounts.write'')))', t || '_delete', t);
  end loop;
end $$;

grant select on public.discount_redemptions, public.price_history, public.inventory, public.inventory_movements,
  public.role_permissions, public.audit_logs, public.email_outbox, public.import_jobs, public.payment_events,
  public.refunds, public.newsletter_subscribers to authenticated;
create policy redemptions_read on public.discount_redemptions for select to authenticated using ((select public.has_perm('discounts.read')));
create policy price_history_read on public.price_history for select to authenticated using ((select public.has_perm('catalog.read')));
create policy inventory_read on public.inventory for select to authenticated
  using ((select public.has_perm('inventory.read')) or (select public.has_perm('catalog.read')));
create policy inventory_movements_read on public.inventory_movements for select to authenticated using ((select public.has_perm('inventory.read')));
create policy role_permissions_read on public.role_permissions for select to authenticated using ((select public.is_staff()));
create policy audit_read on public.audit_logs for select to authenticated using ((select public.has_perm('audit.read')));
create policy outbox_read on public.email_outbox for select to authenticated using ((select public.has_perm('audit.read')));
create policy import_jobs_read on public.import_jobs for select to authenticated using ((select public.has_perm('import.run')));
create policy payment_events_read on public.payment_events for select to authenticated using ((select public.has_perm('orders.read')));
create policy refunds_read on public.refunds for select to authenticated using ((select public.has_perm('orders.read')));
create policy newsletter_read on public.newsletter_subscribers for select to authenticated using ((select public.has_perm('customers.read')));

-- -----------------------------------------------------------------------------
-- Zákaznická data: vlastník, případně pracovník s oprávněním
-- -----------------------------------------------------------------------------
grant select on public.profiles to authenticated;
grant update (first_name, last_name, phone, company_name, company_id, vat_id, preferred_market) on public.profiles to authenticated;
create policy profiles_read on public.profiles for select to authenticated
  using (id = (select auth.uid()) or (select public.has_perm('customers.read')));
create policy profiles_update on public.profiles for update to authenticated
  using (id = (select auth.uid()) or (select public.has_perm('customers.write')))
  with check (id = (select auth.uid()) or (select public.has_perm('customers.write')));

grant select, insert, update, delete on public.addresses to authenticated;
create policy addresses_read on public.addresses for select to authenticated
  using (user_id = (select auth.uid()) or (select public.has_perm('customers.read')));
create policy addresses_insert on public.addresses for insert to authenticated with check (user_id = (select auth.uid()));
create policy addresses_update on public.addresses for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy addresses_delete on public.addresses for delete to authenticated using (user_id = (select auth.uid()));

grant select, insert, delete on public.wishlists, public.wishlist_items, public.recently_viewed to authenticated;
grant update on public.recently_viewed to authenticated;
create policy wishlists_own on public.wishlists for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy wishlist_items_own on public.wishlist_items for all to authenticated
  using (exists (select 1 from public.wishlists w where w.id = wishlist_id and w.user_id = (select auth.uid())))
  with check (exists (select 1 from public.wishlists w where w.id = wishlist_id and w.user_id = (select auth.uid())));
create policy recently_viewed_own on public.recently_viewed for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- Objednávky: zákazník vidí jen své; zápisy výhradně přes funkce se stavovým automatem
grant select on public.orders, public.order_items, public.order_addresses, public.order_status_history,
  public.payments, public.shipments, public.shipment_events, public.order_documents, public.return_requests
  to authenticated;
create policy orders_read on public.orders for select to authenticated
  using (user_id = (select auth.uid()) or (select public.has_perm('orders.read')));
create policy order_items_read on public.order_items for select to authenticated
  using (exists (select 1 from public.orders o where o.id = order_id and o.user_id = (select auth.uid()))
         or (select public.has_perm('orders.read')));
create policy order_addresses_read on public.order_addresses for select to authenticated
  using (exists (select 1 from public.orders o where o.id = order_id and o.user_id = (select auth.uid()))
         or (select public.has_perm('orders.read')));
create policy order_history_read on public.order_status_history for select to authenticated
  using (exists (select 1 from public.orders o where o.id = order_id and o.user_id = (select auth.uid()))
         or (select public.has_perm('orders.read')));
create policy payments_read on public.payments for select to authenticated
  using (exists (select 1 from public.orders o where o.id = order_id and o.user_id = (select auth.uid()))
         or (select public.has_perm('orders.read')));
create policy shipments_read on public.shipments for select to authenticated
  using (exists (select 1 from public.orders o where o.id = order_id and o.user_id = (select auth.uid()))
         or (select public.has_perm('orders.read')));
create policy shipment_events_read on public.shipment_events for select to authenticated
  using (exists (select 1 from public.shipments s join public.orders o on o.id = s.order_id
                  where s.id = shipment_id and o.user_id = (select auth.uid()))
         or (select public.has_perm('orders.read')));
create policy documents_read on public.order_documents for select to authenticated
  using (exists (select 1 from public.orders o where o.id = order_id and o.user_id = (select auth.uid()))
         or (select public.has_perm('orders.read')));
grant insert, delete on public.order_documents to authenticated;
create policy documents_insert on public.order_documents for insert to authenticated with check ((select public.has_perm('orders.write')));
create policy documents_delete on public.order_documents for delete to authenticated using ((select public.has_perm('orders.write')));
create policy returns_read on public.return_requests for select to authenticated
  using (user_id = (select auth.uid()) or (select public.has_perm('returns.manage')));

grant select, insert on public.order_notes to authenticated;
create policy order_notes_read on public.order_notes for select to authenticated using ((select public.has_perm('orders.read')));
create policy order_notes_insert on public.order_notes for insert to authenticated
  with check (author_id = (select auth.uid()) and ((select public.has_perm('orders.write')) or (select public.has_perm('orders.fulfill'))));

-- Recenze: zákazník píše vlastní (stav a „ověřený nákup“ nastavuje trigger), moderace pro pracovníky
grant insert, update, delete on public.reviews to authenticated;
create policy reviews_insert on public.reviews for insert to authenticated
  with check (user_id = (select auth.uid()) or (select public.has_perm('reviews.moderate')));
create policy reviews_update on public.reviews for update to authenticated
  using ((user_id = (select auth.uid()) and status = 'pending') or (select public.has_perm('reviews.moderate')))
  with check ((user_id = (select auth.uid())) or (select public.has_perm('reviews.moderate')));
create policy reviews_delete on public.reviews for delete to authenticated
  using ((user_id = (select auth.uid()) and status = 'pending') or (select public.has_perm('reviews.moderate')));

grant select, update on public.contact_messages to authenticated;
create policy contact_read on public.contact_messages for select to authenticated using ((select public.has_perm('contact.read')));
create policy contact_update on public.contact_messages for update to authenticated
  using ((select public.has_perm('contact.read'))) with check ((select public.has_perm('contact.read')));

grant select, insert, delete on public.customer_notes to authenticated;
create policy customer_notes_read on public.customer_notes for select to authenticated using ((select public.has_perm('customers.read')));
create policy customer_notes_insert on public.customer_notes for insert to authenticated
  with check (author_id = (select auth.uid()) and (select public.has_perm('customers.write')));
create policy customer_notes_delete on public.customer_notes for delete to authenticated
  using (author_id = (select auth.uid()) and (select public.has_perm('customers.write')));

grant select on public.notifications to authenticated;
grant select, insert on public.notification_reads to authenticated;
create policy notifications_read on public.notifications for select to authenticated using ((select public.has_perm(permission)));
create policy notification_reads_own on public.notification_reads for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- carts, cart_items, rate_limits: bez politik = pouze server (service role)

grant usage on all sequences in schema public to authenticated;

-- -----------------------------------------------------------------------------
-- Práva ke spouštění funkcí
-- -----------------------------------------------------------------------------
revoke execute on all functions in schema public from public, anon, authenticated;

grant execute on function
  public.immutable_unaccent(text), public.search_normalize(text), public.slugify(text),
  public.tr(jsonb, text, text, text), public.market_locale(public.market_code),
  public.stock_state(integer, boolean, integer),
  public.has_perm(text), public.is_staff(), public.current_app_role(),
  public.product_cards(uuid[], public.market_code),
  public.catalog_list(public.market_code, text, text, text, text[], jsonb, bigint, bigint, boolean, numeric, boolean, text, integer, integer),
  public.catalog_facets(public.market_code, text, text, text, text[], jsonb, bigint, bigint, boolean, numeric, boolean),
  public.catalog_product(text, public.market_code),
  public.catalog_compare(uuid[], public.market_code),
  public.search_suggest(text, public.market_code, integer),
  public.storefront_categories(public.market_code),
  public.storefront_home(public.market_code)
  to anon, authenticated;

grant execute on function
  public.my_permissions(), public.link_guest_orders(), public.customer_cancel_order(uuid),
  public.create_return_request(uuid, public.return_type, jsonb, text, text),
  public.is_system_call(),
  public.admin_set_user_role(uuid, public.app_role), public.admin_set_user_blocked(uuid, boolean, text),
  public.admin_adjust_stock(uuid, integer, public.inventory_reason, text),
  public.admin_update_inventory_settings(uuid, integer, boolean, date),
  public.admin_save_product(jsonb), public.admin_duplicate_product(uuid),
  public.admin_dashboard(public.market_code, integer), public.admin_search(text),
  public.admin_customers(text, integer, integer), public.admin_import_products(jsonb, text),
  public.admin_unread_notifications(), public.admin_mark_notifications_read(uuid[]),
  public.order_transition(uuid, public.order_status, text),
  public.shipment_upsert(uuid, uuid, text, text, text, public.shipment_status, text, text),
  public.refund_create(uuid, bigint, text, text), public.refund_complete(uuid, boolean, text),
  public.return_set_status(uuid, public.return_status, text, bigint),
  public.log_admin_action(text, text, text, jsonb)
  to authenticated;

grant execute on all functions in schema public to service_role;

-- -----------------------------------------------------------------------------
-- Úložiště: obrázky produktů a obsahu veřejné, doklady k objednávkám soukromé
-- -----------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('product-images', 'product-images', true, 5242880, array['image/jpeg', 'image/png', 'image/webp', 'image/avif']),
  ('content-images', 'content-images', true, 5242880, array['image/jpeg', 'image/png', 'image/webp', 'image/avif']),
  ('order-documents', 'order-documents', false, 10485760, array['application/pdf'])
on conflict (id) do nothing;

create policy "product images write" on storage.objects for insert to authenticated
  with check (bucket_id = 'product-images' and (select public.has_perm('catalog.write')));
create policy "product images update" on storage.objects for update to authenticated
  using (bucket_id = 'product-images' and (select public.has_perm('catalog.write')));
create policy "product images delete" on storage.objects for delete to authenticated
  using (bucket_id = 'product-images' and (select public.has_perm('catalog.write')));
create policy "content images write" on storage.objects for insert to authenticated
  with check (bucket_id = 'content-images' and (select public.has_perm('content.write')));
create policy "content images delete" on storage.objects for delete to authenticated
  using (bucket_id = 'content-images' and (select public.has_perm('content.write')));
create policy "order documents read" on storage.objects for select to authenticated
  using (bucket_id = 'order-documents' and (
    (select public.has_perm('orders.read'))
    or exists (select 1 from public.orders o
                where o.id::text = (storage.foldername(name))[1] and o.user_id = (select auth.uid()))));
create policy "order documents write" on storage.objects for insert to authenticated
  with check (bucket_id = 'order-documents' and (select public.has_perm('orders.write')));
create policy "order documents delete" on storage.objects for delete to authenticated
  using (bucket_id = 'order-documents' and (select public.has_perm('orders.write')));
