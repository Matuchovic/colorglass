import { afterAll, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import {
  closeDb, createCart, createOrder, createProduct, db, hasDb, inventory, orderPayload, serviceClient, shippingId, variantIdBySlug,
} from "./helpers";

type Quote = {
  subtotal: number; discount_total: number; shipping_total: number; payment_fee_total: number; grand_total: number;
  tax_total: number; goods_total: number; discount: { status: string; amount: number } | null;
  lines: Array<{ discount_amount: number; line_total: number; tax_amount: number; name: string }>;
  shipping_methods: Array<{ code: string; price: number; available: boolean }>;
  payment_methods: Array<{ code: string; available: boolean }>;
  vat_breakdown: Array<{ rate_bps: number; total: number; tax: number }>;
  issues: Array<{ code: string }>;
};

async function quote(cartId: string, opts: { ship?: string | null; pay?: string | null; code?: string | null; market?: "CZ" | "SK" } = {}) {
  const r = await db().query<{ q: Quote }>("select public.pricing_quote($1, $2, $3, $4, $5, $6, null) as q", [
    cartId, opts.market ?? "CZ", opts.ship ?? null, opts.pay ?? null, opts.code ?? null, `q-${randomUUID()}@example.cz`,
  ]);
  return r.rows[0]!.q;
}

describe.skipIf(!hasDb)("ceny počítá výhradně databáze", () => {
  afterAll(closeDb);

  it("sečte položky, DPH a dopravu zdarma nad limitem", async () => {
    const cart = await createCart([
      { variantId: await variantIdBySlug("color-sport"), quantity: 1 },
      { variantId: await variantIdBySlug("color-pro-outdoor"), quantity: 1 },
    ]);
    const q = await quote(cart, { ship: await shippingId("ppl"), pay: "cod" });
    expect(q.subtotal).toBe(299000 + 299000);
    expect(q.shipping_total).toBe(0); // nad 799 Kč
    expect(q.payment_fee_total).toBe(3900); // dobírka
    expect(q.grand_total).toBe(q.subtotal + q.payment_fee_total);
    const vat = q.vat_breakdown.find((v) => v.rate_bps === 2100)!;
    expect(vat.total).toBe(q.grand_total);
    expect(q.tax_total).toBe(q.vat_breakdown.reduce((s, v) => s + v.tax, 0));
    expect(q.issues).toEqual([]);
  });

  it("procentní kupón rozpočítá na řádky beze zbytku", async () => {
    const cart = await createCart([
      { variantId: await variantIdBySlug("color-sport"), quantity: 1 },
      { variantId: await variantIdBySlug("color-kids"), quantity: 3 },
    ]);
    const q = await quote(cart, { code: "vitejte10" });
    expect(q.discount?.status).toBe("APPLIED");
    expect(q.discount_total).toBe(Math.floor((299000 + 3 * 179000) * 0.1));
    expect(q.lines.reduce((s, l) => s + l.discount_amount, 0)).toBe(q.discount_total);
    expect(q.goods_total).toBe(q.subtotal - q.discount_total);
  });

  it("kupón na kategorii se uplatní jen na odpovídající položky", async () => {
    const cart = await createCart([
      { variantId: await variantIdBySlug("color-clip-on"), quantity: 1 },
      { variantId: await variantIdBySlug("color-kids"), quantity: 1 },
    ]);
    const q = await quote(cart, { code: "CLIP300" });
    expect(q.discount?.status).toBe("APPLIED");
    expect(q.discount_total).toBe(30000);
    const kids = q.lines.find((l) => l.name.includes("Kids"))!; // mimo kategorii Clip-on
    expect(kids.discount_amount).toBe(0);
  });

  it("odmítne kupón pod minimální hodnotou a neznámý kód", async () => {
    const cheap = await createProduct({ stock: 5, priceCz: 50000, priceSk: 2000 }); // pod minimem 1 000 Kč
    const cart = await createCart([{ variantId: cheap.variantId, quantity: 1 }]);
    expect((await quote(cart, { code: "VITEJTE10" })).discount?.status).toBe("MIN_SUBTOTAL");
    expect((await quote(cart, { code: "NEEXISTUJE" })).discount?.status).toBe("NOT_FOUND");
    expect((await quote(cart, { code: "DOPRAVA0" })).shipping_methods.every((m) => m.price === 0)).toBe(true);
  });

  it("dobírka není dostupná u dopravy, která ji nepodporuje", async () => {
    const ship = await shippingId("gls");
    await db().query("update public.shipping_methods set cod_allowed = false where id = $1", [ship]);
    try {
      const cart = await createCart([{ variantId: await variantIdBySlug("color-pro-outdoor"), quantity: 1 }]);
      const q = await quote(cart, { ship, pay: "cod" });
      expect(q.payment_methods.find((p) => p.code === "cod")?.available).toBe(false);
      expect(q.issues.map((i) => i.code)).toContain("PAYMENT_INVALID");
    } finally {
      await db().query("update public.shipping_methods set cod_allowed = true where id = $1", [ship]);
    }
  });
});

describe.skipIf(!hasDb)("objednávka: atomičnost, idempotence, sklad", () => {
  afterAll(closeDb);

  it("vytvoří objednávku, rezervuje sklad a opakovaný požadavek vrátí stejnou objednávku", async () => {
    const { variantId } = await createProduct({ stock: 5 });
    const cart = await createCart([{ variantId, quantity: 2 }]);
    const payload = orderPayload(cart, await shippingId("ppl"));
    const first = await createOrder(db(), payload);
    expect(first.number).toMatch(/^\d{10}$/);
    expect(first.status).toBe("awaiting_payment");
    expect(await inventory(variantId)).toEqual({ quantity_on_hand: 5, quantity_reserved: 2 });
    const again = await createOrder(db(), payload);
    expect(again.existing).toBe(true);
    expect(again.order_id).toBe(first.order_id);
    expect(await inventory(variantId)).toEqual({ quantity_on_hand: 5, quantity_reserved: 2 });
  });

  it("odmítne objednávku, pokud se mezitím změnila cena (TOTAL_CHANGED) a nic neuloží", async () => {
    const { variantId } = await createProduct({ stock: 3, priceCz: 100000 });
    const cart = await createCart([{ variantId, quantity: 1 }]);
    const payload = orderPayload(cart, await shippingId("ppl"), { expected_total: 100000 + 12900 });
    await db().query("update public.product_prices set price = 120000 where variant_id = $1 and market = 'CZ'", [variantId]);
    await expect(createOrder(db(), payload)).rejects.toThrow(/TOTAL_CHANGED/);
    expect((await inventory(variantId)).quantity_reserved).toBe(0);
  });

  it("dva zákazníci současně kupují poslední kus – projde právě jeden", async () => {
    const { variantId } = await createProduct({ stock: 1 });
    const ship = await shippingId("ppl");
    const clients = await Promise.all([serviceClient(), serviceClient(), serviceClient()]);
    try {
      const carts = await Promise.all(clients.map(() => createCart([{ variantId, quantity: 1 }])));
      const results = await Promise.allSettled(clients.map((c, i) => createOrder(c, orderPayload(carts[i]!, ship))));
      const ok = results.filter((r) => r.status === "fulfilled");
      const failed = results.filter((r): r is PromiseRejectedResult => r.status === "rejected");
      expect(ok).toHaveLength(1);
      expect(failed).toHaveLength(2);
      for (const f of failed) expect(String(f.reason)).toMatch(/OUT_OF_STOCK|INSUFFICIENT_STOCK/);
      expect(await inventory(variantId)).toEqual({ quantity_on_hand: 1, quantity_reserved: 1 });
    } finally {
      await Promise.all(clients.map((c) => c.end()));
    }
  });

  it("jednorázový kupón nelze souběžně uplatnit dvakrát", async () => {
    const code = `RACE${randomUUID().slice(0, 6).toUpperCase()}`;
    const d = await db().query<{ id: string }>(
      "insert into public.discounts (name, type, percent_bps, usage_limit) values ('Test souběh', 'percentage', 1000, 1) returning id",
    );
    await db().query("insert into public.discount_codes (discount_id, code) values ($1, $2)", [d.rows[0]!.id, code]);
    const { variantId } = await createProduct({ stock: 10 });
    const ship = await shippingId("ppl");
    const clients = await Promise.all([serviceClient(), serviceClient()]);
    try {
      const carts = await Promise.all(clients.map(() => createCart([{ variantId, quantity: 1 }])));
      const results = await Promise.allSettled(
        clients.map((c, i) => createOrder(c, orderPayload(carts[i]!, ship, { discount_code: code }))),
      );
      expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
      const rejected = results.find((r): r is PromiseRejectedResult => r.status === "rejected");
      expect(String(rejected?.reason)).toMatch(/DISCOUNT_USAGE_LIMIT/);
      const used = await db().query<{ times_used: number }>("select times_used from public.discounts where id = $1", [d.rows[0]!.id]);
      expect(used.rows[0]!.times_used).toBe(1);
      expect((await inventory(variantId)).quantity_reserved).toBe(1);
    } finally {
      await Promise.all(clients.map((c) => c.end()));
    }
  });

  it("storno uvolní rezervaci a vrátí použití kupónu, expedice odečte sklad", async () => {
    const { variantId } = await createProduct({ stock: 4 });
    const ship = await shippingId("ppl");
    const cartA = await createCart([{ variantId, quantity: 2 }]);
    const a = await createOrder(db(), orderPayload(cartA, ship, { payment_method_code: "cod", discount_code: "DOPRAVA0" }));
    expect(a.status).toBe("new");
    await db().query("select public.order_transition($1, 'cancelled', 'test')", [a.order_id]);
    expect(await inventory(variantId)).toEqual({ quantity_on_hand: 4, quantity_reserved: 0 });
    const redemption = await db().query("select 1 from public.discount_redemptions where order_id = $1", [a.order_id]);
    expect(redemption.rowCount).toBe(0);

    const cartB = await createCart([{ variantId, quantity: 3 }]);
    const b = await createOrder(db(), orderPayload(cartB, ship, { payment_method_code: "cod" }));
    await db().query("select public.order_transition($1, 'processing', null)", [b.order_id]);
    await db().query("select public.order_transition($1, 'shipped', null)", [b.order_id]);
    expect(await inventory(variantId)).toEqual({ quantity_on_hand: 1, quantity_reserved: 0 });
    await expect(db().query("select public.order_transition($1, 'awaiting_payment', null)", [b.order_id])).rejects.toThrow(/INVALID_TRANSITION/);
    await db().query("select public.order_transition($1, 'delivered', null)", [b.order_id]);
    const paid = await db().query<{ payment_status: string }>("select payment_status from public.orders where id = $1", [b.order_id]);
    expect(paid.rows[0]!.payment_status).toBe("paid"); // dobírka zaplacena při doručení
  });

  it("automaticky zruší nezaplacenou objednávku po vypršení rezervace", async () => {
    const { variantId } = await createProduct({ stock: 2 });
    const cart = await createCart([{ variantId, quantity: 2 }]);
    const o = await createOrder(db(), orderPayload(cart, await shippingId("ppl")));
    await db().query("update public.orders set reservation_expires_at = now() - interval '1 minute' where id = $1", [o.order_id]);
    const expired = await db().query<{ r: Array<{ order_id: string }> }>("select public.expire_unpaid_orders(50) as r");
    expect(expired.rows[0]!.r.map((x) => x.order_id)).toContain(o.order_id);
    expect(await inventory(variantId)).toEqual({ quantity_on_hand: 2, quantity_reserved: 0 });
  });
});

describe.skipIf(!hasDb)("platby: idempotentní webhooky", () => {
  afterAll(closeDb);

  it("stejná událost se zpracuje jen jednou, platba označí objednávku jako zaplacenou", async () => {
    const { variantId } = await createProduct({ stock: 3 });
    const cart = await createCart([{ variantId, quantity: 1 }]);
    const o = await createOrder(db(), orderPayload(cart, await shippingId("ppl"), { payment_method_code: "card" }));
    const eventId = `evt-${randomUUID()}`;
    const apply = () =>
      db().query<{ r: { duplicate: boolean; result?: string; order_paid?: boolean } }>(
        "select public.payment_apply_event('comgate', $1, 'PAID', $2, 'TRANS-1', 'paid', $3, 'CZK', '{}'::jsonb) as r",
        [eventId, o.payment_id, o.grand_total],
      );
    const first = (await apply()).rows[0]!.r;
    expect(first.duplicate).toBe(false);
    expect(first.order_paid).toBe(true);
    const second = (await apply()).rows[0]!.r;
    expect(second.duplicate).toBe(true);
    const order = await db().query<{ status: string; payment_status: string }>("select status, payment_status from public.orders where id = $1", [o.order_id]);
    expect(order.rows[0]).toEqual({ status: "paid", payment_status: "paid" });
    const history = await db().query("select 1 from public.order_status_history where order_id = $1 and to_status = 'paid'", [o.order_id]);
    expect(history.rowCount).toBe(1);
  });

  it("nesouhlasná částka platbu nezaúčtuje", async () => {
    const { variantId } = await createProduct({ stock: 3 });
    const cart = await createCart([{ variantId, quantity: 1 }]);
    const o = await createOrder(db(), orderPayload(cart, await shippingId("ppl"), { payment_method_code: "card" }));
    const r = await db().query<{ r: { result: string } }>(
      "select public.payment_apply_event('comgate', $1, 'PAID', $2, null, 'paid', 100, 'CZK', null) as r",
      [`evt-${randomUUID()}`, o.payment_id],
    );
    expect(r.rows[0]!.r.result).toBe("amount_mismatch");
    const order = await db().query<{ payment_status: string }>("select payment_status from public.orders where id = $1", [o.order_id]);
    expect(order.rows[0]!.payment_status).toBe("pending");
  });
});
