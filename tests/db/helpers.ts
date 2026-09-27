import { Client, Pool, type PoolClient } from "pg";
import { randomBytes, randomUUID } from "node:crypto";

export const DATABASE_URL = process.env.DATABASE_URL;
export const hasDb = Boolean(DATABASE_URL);

let pool: Pool | null = null;
export function db(): Pool {
  if (!pool) pool = new Pool({ connectionString: DATABASE_URL, max: 8 });
  return pool;
}
export async function closeDb(): Promise<void> {
  if (pool) await pool.end();
  pool = null;
}

type Json = Record<string, unknown>;

/** Spustí dotazy jako role Supabase (anon / authenticated s daným uživatelem / service_role). */
export async function as<T>(
  who: { role: "anon" | "service_role" } | { role: "authenticated"; userId: string },
  fn: (c: PoolClient) => Promise<T>,
): Promise<T> {
  const c = await db().connect();
  try {
    await c.query("begin");
    await c.query(`set local role ${who.role}`);
    const claims = who.role === "authenticated" ? { sub: who.userId, role: "authenticated" } : { role: who.role };
    await c.query("select set_config('request.jwt.claims', $1, true)", [JSON.stringify(claims)]);
    const result = await fn(c);
    await c.query("commit");
    return result;
  } catch (error) {
    await c.query("rollback");
    throw error;
  } finally {
    c.release();
  }
}

/** Samostatné spojení pro souběžné transakce (každé vlastní session). */
export async function serviceClient(): Promise<Client> {
  const c = new Client({ connectionString: DATABASE_URL });
  await c.connect();
  await c.query("set role service_role");
  return c;
}

export async function userIdByEmail(email: string): Promise<string> {
  const r = await db().query<{ id: string }>("select id from public.profiles where email = $1", [email]);
  if (!r.rows[0]) throw new Error(`Uživatel ${email} v seedu chybí`);
  return r.rows[0].id;
}

export async function createProduct(opts: { stock: number; priceCz?: number; priceSk?: number; backorder?: boolean }) {
  const slug = `test-${randomUUID().slice(0, 8)}`;
  const c = db();
  const product = await c.query<{ id: string }>(
    `insert into public.products (slug, name, is_active, primary_category_id)
     values ($1, $2, true, (select id from public.categories where path = 'bryle/protan')) returning id`,
    [slug, `Testovací produkt ${slug}`],
  );
  const productId = product.rows[0]!.id;
  await c.query("insert into public.product_categories (product_id, category_id) select $1, id from public.categories where path = 'bryle/protan'", [productId]);
  const variant = await c.query<{ id: string }>(
    "insert into public.product_variants (product_id, sku, is_default) values ($1, $2, true) returning id",
    [productId, `SKU-${slug}`.toUpperCase()],
  );
  const variantId = variant.rows[0]!.id;
  await c.query("insert into public.product_prices (variant_id, market, price) values ($1, 'CZ', $2), ($1, 'SK', $3)", [
    variantId,
    opts.priceCz ?? 100000,
    opts.priceSk ?? 4000,
  ]);
  await c.query("update public.inventory set quantity_on_hand = $2, allow_backorder = $3 where variant_id = $1", [
    variantId,
    opts.stock,
    opts.backorder ?? false,
  ]);
  return { productId, variantId, slug };
}

export async function createCart(lines: Array<{ variantId: string; quantity: number }>, market: "CZ" | "SK" = "CZ") {
  const cart = await db().query<{ id: string }>(
    "insert into public.carts (token_hash, market) values ($1, $2) returning id",
    [randomBytes(32).toString("hex"), market],
  );
  const cartId = cart.rows[0]!.id;
  for (const line of lines) {
    await db().query("insert into public.cart_items (cart_id, variant_id, quantity) values ($1, $2, $3)", [
      cartId,
      line.variantId,
      line.quantity,
    ]);
  }
  return cartId;
}

export async function variantIdBySlug(slug: string): Promise<string> {
  const r = await db().query<{ id: string }>(
    "select v.id from public.product_variants v join public.products p on p.id = v.product_id where p.slug = $1 and v.is_default",
    [slug],
  );
  return r.rows[0]!.id;
}

export async function shippingId(code: string): Promise<string> {
  const r = await db().query<{ id: string }>("select id from public.shipping_methods where code = $1", [code]);
  return r.rows[0]!.id;
}

export function orderPayload(cartId: string, shippingMethodId: string, overrides: Json = {}): Json {
  return {
    idempotency_key: `test-${randomUUID()}`,
    cart_id: cartId,
    user_id: null,
    email: `test-${randomUUID().slice(0, 8)}@example.cz`,
    phone: "+420 777 123 456",
    market: "CZ",
    locale: "cs",
    shipping_method_id: shippingMethodId,
    payment_method_code: "bank_transfer",
    billing: { first_name: "Jan", last_name: "Novák", street: "Dlouhá 1", city: "Praha", postal_code: "110 00", country: "CZ" },
    shipping_address: { first_name: "Jan", last_name: "Novák", street: "Dlouhá 1", city: "Praha", postal_code: "110 00", country: "CZ" },
    terms_version: "test",
    access_token_hash: "a".repeat(64),
    ...overrides,
  };
}

export async function createOrder(client: Pick<Pool, "query"> | Client, payload: Json) {
  const r = await client.query<{ result: Json }>("select public.create_order($1::jsonb) as result", [JSON.stringify(payload)]);
  return r.rows[0]!.result as { order_id: string; number: string; status: string; grand_total: number; payment_id: string; existing: boolean };
}

export async function inventory(variantId: string) {
  const r = await db().query<{ quantity_on_hand: number; quantity_reserved: number }>(
    "select quantity_on_hand, quantity_reserved from public.inventory where variant_id = $1",
    [variantId],
  );
  return r.rows[0]!;
}
