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
