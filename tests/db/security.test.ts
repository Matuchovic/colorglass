import { afterAll, describe, expect, it } from "vitest";
import { as, closeDb, createCart, createOrder, createProduct, db, hasDb, orderPayload, shippingId, userIdByEmail, variantIdBySlug } from "./helpers";

describe.skipIf(!hasDb)("RLS a oprávnění", () => {
  afterAll(closeDb);

  it("zákazník vidí jen své objednávky a adresy", async () => {
    const martina = await userIdByEmail("martina@example.cz");
    const peter = await userIdByEmail("peter@example.sk");
    const rows = await as({ role: "authenticated", userId: martina }, async (c) => {
      const orders = await c.query<{ user_id: string }>("select user_id from public.orders");
      const addresses = await c.query<{ user_id: string }>("select user_id from public.addresses");
      const peters = await c.query("select 1 from public.orders where user_id = $1", [peter]);
      return { orders: orders.rows, addresses: addresses.rows, peters: peters.rowCount };
    });
    expect(rows.orders.length).toBeGreaterThan(0);
    expect(rows.orders.every((o) => o.user_id === martina)).toBe(true);
    expect(rows.addresses.every((a) => a.user_id === martina)).toBe(true);
    expect(rows.peters).toBe(0);
  });

  it("anonym nevidí košíky, sklad, slevové kódy ani neaktivní produkty", async () => {
    await db().query("update public.products set is_active = false where slug = 'color-kids'");
    try {
      await as({ role: "anon" }, async (c) => {
        for (const table of ["carts", "cart_items", "inventory", "discount_codes", "payments", "rate_limits", "email_outbox"]) {
          await c.query("savepoint s");
          await expect(c.query(`select * from public.${table}`)).rejects.toThrow(/permission denied/);
          await c.query("rollback to savepoint s");
        }
        const hidden = await c.query("select 1 from public.products where slug = 'color-kids'");
        expect(hidden.rowCount).toBe(0);
        const listed = await c.query<{ r: { items: Array<{ slug: string }> } }>("select public.catalog_list('CZ') as r");
        expect(listed.rows[0]!.r.items.some((i) => i.slug === "color-kids")).toBe(false);
      });
    } finally {
      await db().query("update public.products set is_active = true where slug = 'color-kids'");
    }
  });

  it("zákazník si nezmění roli ani nezavolá administrátorské funkce", async () => {
    const tomas = await userIdByEmail("tomas@example.cz");
    await expect(as({ role: "authenticated", userId: tomas }, (c) =>
      c.query("update public.profiles set role = 'superadmin' where id = $1", [tomas]))).rejects.toThrow(/permission denied/);
    await expect(as({ role: "authenticated", userId: tomas }, (c) =>
      c.query("select public.admin_dashboard('CZ', 30)"))).rejects.toThrow(/FORBIDDEN/);
    await expect(as({ role: "authenticated", userId: tomas }, (c) =>
      c.query("select public.pricing_quote(gen_random_uuid(), 'CZ')"))).rejects.toThrow(/permission denied/);
    const own = await as({ role: "authenticated", userId: tomas }, (c) =>
      c.query("update public.profiles set phone = '+420 700 000 000' where id = $1", [tomas]));
    expect(own.rowCount).toBe(1);
  });

  it("role se liší: sklad upraví zásobu, ale ne produkt; podpora nevidí sklad", async () => {
    const sklad = await userIdByEmail("sklad@color.test");
    const podpora = await userIdByEmail("podpora@color.test");
    const variant = await variantIdBySlug("color-clip-on");
    const adjusted = await as({ role: "authenticated", userId: sklad }, (c) =>
      c.query<{ quantity_on_hand: number }>("select (public.admin_adjust_stock($1, 5, 'purchase', 'Naskladnění')).quantity_on_hand", [variant]));
    expect(adjusted.rows[0]!.quantity_on_hand).toBeGreaterThan(0);
    await expect(as({ role: "authenticated", userId: sklad }, (c) =>
      c.query("select public.admin_save_product('{\"name\":\"X\",\"slug\":\"x\"}'::jsonb)"))).rejects.toThrow(/FORBIDDEN/);
    const movements = await as({ role: "authenticated", userId: podpora }, (c) => c.query("select 1 from public.inventory_movements"));
    expect(movements.rowCount).toBe(0);
    const movementsSklad = await as({ role: "authenticated", userId: sklad }, (c) => c.query("select 1 from public.inventory_movements limit 1"));
    expect(movementsSklad.rowCount).toBe(1);
  });

  it("recenze zákazníka čeká na schválení a ověřený nákup určí databáze", async () => {
    const jana = await userIdByEmail("jana@example.cz");
    const { productId } = await createProduct({ stock: 1 }); // produkt, který zákaznice určitě nekoupila
    const r = await as({ role: "authenticated", userId: jana }, (c) =>
      c.query<{ status: string; is_verified_purchase: boolean }>(
        `insert into public.reviews (product_id, user_id, author_name, rating, body, status, is_verified_purchase)
         values ($1, $2, 'Jana', 5, 'Skvělá vrtačka, doporučuji všem kutilům.', 'approved', true)
         returning status, is_verified_purchase`, [productId, jana]));
    expect(r.rows[0]).toEqual({ status: "pending", is_verified_purchase: false });
  });

  it("objednávku lze založit jen serverem (service role)", async () => {
    const cart = await createCart([{ variantId: await variantIdBySlug("color-pro-outdoor"), quantity: 1 }]);
    const ship = await shippingId("ppl");
    await expect(as({ role: "anon" }, (c) => createOrder(c, orderPayload(cart, ship)))).rejects.toThrow(/permission denied/);
    const ok = await as({ role: "service_role" }, (c) => createOrder(c, orderPayload(cart, ship)));
    expect(ok.number).toMatch(/^\d{10}$/);
  });

  it("zákazník zruší vlastní nezaplacenou objednávku, cizí ne", async () => {
    const eva = await userIdByEmail("eva@example.cz");
    const michal = await userIdByEmail("michal@example.cz");
    const cart = await createCart([{ variantId: await variantIdBySlug("color-clip-on"), quantity: 1 }]);
    const o = await createOrder(db(), orderPayload(cart, await shippingId("ppl"), { user_id: eva, email: "eva@example.cz" }));
    await expect(as({ role: "authenticated", userId: michal }, (c) =>
      c.query("select public.customer_cancel_order($1)", [o.order_id]))).rejects.toThrow(/NOT_FOUND/);
    const r = await as({ role: "authenticated", userId: eva }, (c) =>
      c.query<{ r: { status: string } }>("select public.customer_cancel_order($1) as r", [o.order_id]));
    expect(r.rows[0]!.r.status).toBe("cancelled");
  });

  it("CSV import: chybný řádek nezastaví import a skončí v reportu", async () => {
    const admin = await userIdByEmail("admin@color.test");
    const sku = `IMP-${Date.now()}`;
    const r = await as({ role: "authenticated", userId: admin }, (c) =>
      c.query<{ r: { created: number; errors: Array<{ row: number; error: string }> } }>(
        "select public.admin_import_products($1::jsonb, 'test.csv') as r",
        [JSON.stringify([
          { sku, name: "Importovaný produkt", price_czk: "1290", price_eur: "49,90", stock: "7", category_path: "bryle/indoor", brand: "Voltra" },
          { sku: "špatné sku!", name: "X", price_czk: "abc" },
          { sku: `${sku}-2`, name: "Bez kategorie", price_czk: "990", category_path: "neexistuje" },
        ])]));
    expect(r.rows[0]!.r.created).toBe(1);
    expect(r.rows[0]!.r.errors.map((e) => e.row)).toEqual([2, 3]);
    const stock = await db().query<{ quantity_on_hand: number }>(
      "select i.quantity_on_hand from public.inventory i join public.product_variants v on v.id = i.variant_id where v.sku = $1", [sku]);
    expect(stock.rows[0]!.quantity_on_hand).toBe(7);
  });
});
