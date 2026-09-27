-- =============================================================================
-- Transakční e-maily (outbox pattern): e-mail se zařadí do fronty ve stejné transakci
-- jako změna stavu. Odesílá cron (/api/cron/maintenance) s deduplikací a opakováním.
-- =============================================================================

create or replace function public.orders_enqueue_emails() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    perform public.enqueue_email('order_created', new.email, new.locale,
      jsonb_build_object('order_id', new.id), 'order:' || new.id || ':created');
  elsif new.status is distinct from old.status and new.status in ('paid', 'shipped', 'delivered', 'cancelled') then
    perform public.enqueue_email('order_' || new.status::text, new.email, new.locale,
      jsonb_build_object('order_id', new.id), 'order:' || new.id || ':' || new.status::text);
  end if;
  return null;
end $$;

drop trigger if exists orders_enqueue_emails on public.orders;
create trigger orders_enqueue_emails after insert or update of status on public.orders
  for each row execute function public.orders_enqueue_emails();

create or replace function public.returns_enqueue_emails() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_order public.orders;
begin
  select * into v_order from public.orders where id = new.order_id;
  if not found then return null; end if;
  if tg_op = 'INSERT' then
    perform public.enqueue_email('return_created', v_order.email, v_order.locale,
      jsonb_build_object('return_id', new.id, 'order_id', new.order_id), 'return:' || new.id || ':created');
  elsif new.status is distinct from old.status then
    perform public.enqueue_email('return_status', v_order.email, v_order.locale,
      jsonb_build_object('return_id', new.id, 'order_id', new.order_id, 'status', new.status),
      'return:' || new.id || ':' || new.status::text);
  end if;
  return null;
end $$;

drop trigger if exists returns_enqueue_emails on public.return_requests;
create trigger returns_enqueue_emails after insert or update of status on public.return_requests
  for each row execute function public.returns_enqueue_emails();

revoke all on function public.orders_enqueue_emails() from public, anon, authenticated;
revoke all on function public.returns_enqueue_emails() from public, anon, authenticated;
