#!/usr/bin/env node
// Exportuje data pro náhledový režim (web bez připojené databáze, např. první nasazení na Vercel).
// Použití: DATABASE_URL=postgres://… node scripts/export-preview-snapshot.mjs  (DB s migracemi a seedem)
import pg from "pg";
import { writeFileSync } from "node:fs";

const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();
const one = async (sql, params = []) => (await client.query(sql, params)).rows[0]?.v;

const markets = {};
for (const market of ["CZ", "SK"]) {
  const home = await one("select public.storefront_home($1) as v", [market]);
  const categories = await one("select public.storefront_categories($1) as v", [market]);
  const ids = (await client.query("select id from public.products where is_active order by sold_count desc")).rows.map((r) => r.id);
  const products = await one("select public.product_cards($1::uuid[], $2) as v", [ids, market]);
  const details = {};
  for (const { slug } of (await client.query("select slug from public.products where is_active")).rows) {
    details[slug] = await one("select public.catalog_product($1, $2) as v", [slug, market]);
  }
  markets[market] = { home: home.sections, categories, products, details };
}
const settings = Object.fromEntries(
  (await client.query("select key, value from public.store_settings where is_public")).rows.map((r) => [r.key, r.value]),
);
const thresholds = Object.fromEntries(
  (await client.query("select code, free_shipping_threshold from public.markets")).rows.map((r) => [r.code, r.free_shipping_threshold]),
);
const footerPages = (
  await client.query(
    "select slug, title, body, seo_description, footer_group, sort_order, translations, requires_legal_review, updated_at from public.content_pages where is_active order by sort_order",
  )
).rows;
const index = (
  await client.query(`
    select p.id, p.slug, p.created_at, p.sold_count, b.slug as brand_slug,
           coalesce((select array_agg(c.path order by c.path) from public.product_categories pc
                       join public.categories c on c.id = pc.category_id where pc.product_id = p.id), '{}') as categories,
           coalesce((select jsonb_object_agg(x.code, x.slugs) from (
                       select a.code, jsonb_agg(av.slug order by av.sort_order) as slugs
                         from public.product_attribute_values pav
                         join public.attributes a on a.id = pav.attribute_id
                         join public.attribute_values av on av.id = pav.value_id
                        where pav.product_id = p.id group by a.code) x), '{}') as attrs
      from public.products p
      left join public.brands b on b.id = p.brand_id
     where p.is_active`)
).rows;
await client.end();

const snapshot = { generated_at: new Date().toISOString(), markets, settings, thresholds, footerPages, index };
writeFileSync(new URL("../src/server/preview/snapshot.json", import.meta.url), JSON.stringify(snapshot));
console.log("Snapshot náhledu uložen do src/server/preview/snapshot.json");
