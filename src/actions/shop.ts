"use server";

import { z } from "zod";
import { isStoreCode, siteUrl, STORES, type StoreCode } from "@/lib/store";
import { PREVIEW_MODE } from "@/lib/preview";
import { rateLimit } from "@/lib/security/rate-limit";
import { requestIpHash } from "@/lib/security/request";
import { randomToken, sha256Hex } from "@/lib/security/crypto";
import { newsletterSchema } from "@/lib/validation";
import { logger } from "@/lib/logger";
import { getDictionary } from "@/i18n";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { addItem, cartCount } from "@/server/cart";
import { sendEmail } from "@/server/email/provider";
import { button, escapeHtml, htmlToText, layout } from "@/server/email/layout";

// ── Košík ────────────────────────────────────────────────────────────────────
export type AddToCartResult =
  | { ok: true; count: number; capped: boolean }
  | { ok: false; error: "PREVIEW" | "INVALID" | "UNAVAILABLE" | "LIMIT" | "RATE_LIMITED" | "ERROR" };

export async function addToCartAction(storeCode: string, variantId: string, quantity = 1): Promise<AddToCartResult> {
  if (PREVIEW_MODE) return { ok: false, error: "PREVIEW" };
  if (!isStoreCode(storeCode) || !z.uuid().safeParse(variantId).success || !Number.isInteger(quantity) || quantity < 1 || quantity > 99) {
    return { ok: false, error: "INVALID" };
  }
  if (!(await rateLimit("cart"))) return { ok: false, error: "RATE_LIMITED" };
  try {
    const market = STORES[storeCode].market;
    const result = await addItem(market, variantId, quantity);
    if (!result.ok) return { ok: false, error: result.error === "NOT_FOUND" ? "ERROR" : result.error };
    return { ok: true, count: await cartCount(market), capped: Boolean(result.capped) };
  } catch (error) {
    logger.error("cart.add_failed", { error });
    return { ok: false, error: "ERROR" };
  }
}

// ── Newsletter (double opt-in) ───────────────────────────────────────────────
export type NewsletterState = {
  status: "idle" | "success" | "already" | "invalid" | "consent" | "rate_limited" | "preview" | "error";
  at?: number;
};

export async function subscribeNewsletterAction(_prev: NewsletterState, formData: FormData): Promise<NewsletterState> {
  const at = Date.now();
  const storeCode = String(formData.get("store") ?? "cz");
  const store: StoreCode = isStoreCode(storeCode) ? storeCode : "cz";
  if (PREVIEW_MODE) return { status: "preview", at };

  // Honeypot / příliš rychlé odeslání = bot → tváříme se úspěšně, nic neukládáme
  const startedAt = Number(formData.get("started_at"));
  if (String(formData.get("website") ?? "") !== "" || !Number.isFinite(startedAt) || at - startedAt < 2500) {
    return { status: "success", at };
  }
  const parsed = newsletterSchema.safeParse({
    email: formData.get("email"),
    consent: formData.get("consent") === "on",
    website: "",
    started_at: startedAt,
  });
  if (!parsed.success) {
    return { status: parsed.error.issues.some((i) => i.path[0] === "consent") ? "consent" : "invalid", at };
  }
  if (!(await rateLimit("newsletter"))) return { status: "rate_limited", at };

  const { email } = parsed.data;
  const cfg = STORES[store];
  const t = getDictionary(cfg.locale);
  try {
    const admin = supabaseAdmin();
    const { data: existing } = await admin.from("newsletter_subscribers").select("id, status").eq("email", email).maybeSingle();
    if (existing?.status === "confirmed") return { status: "already", at };

    const token = randomToken(32);
    const now = new Date().toISOString();
    const row = {
      email,
      status: "pending" as const,
      market: cfg.market,
      locale: cfg.locale,
      source: "homepage",
      consent_text: t.newsletter.consentText,
      consent_at: now,
      confirm_token_hash: sha256Hex(token),
      confirm_sent_at: now,
      ip_hash: await requestIpHash(),
    };
    const { error } = existing
      ? await admin.from("newsletter_subscribers").update(row).eq("id", existing.id)
      : await admin.from("newsletter_subscribers").insert(row);
    if (error) throw new Error(error.message);

    const confirmUrl = `${siteUrl(store)}/api/newsletter/confirm?token=${encodeURIComponent(token)}&store=${store}`;
    const sk = cfg.locale === "sk";
    const title = sk ? "Potvrďte odber noviniek" : "Potvrďte odběr novinek";
    const html = layout({
      preheader: sk ? "Jedno kliknutie a ste v obraze." : "Jedno kliknutí a jste v obraze.",
      title,
      body: `<p>${escapeHtml(sk
        ? "Ďakujeme za záujem o novinky COLOR. Odber aktivujete kliknutím na tlačidlo:"
        : "Děkujeme za zájem o novinky COLOR. Odběr aktivujete kliknutím na tlačítko:")}</p>
${button(confirmUrl, sk ? "Potvrdiť odber" : "Potvrdit odběr")}
<p style="font-size:13px;color:#5f6b86">${escapeHtml(sk
        ? "Ak ste sa neprihlásili vy, tento e-mail ignorujte – bez potvrdenia vám nič posielať nebudeme."
        : "Pokud jste se nepřihlásili vy, e-mail ignorujte – bez potvrzení vám nic posílat nebudeme.")}</p>`,
      footer: "COLOR · color.cz",
    });
    await sendEmail({ to: email, subject: `${title} | COLOR`, html, text: htmlToText(html), idempotencyKey: `newsletter-${sha256Hex(token).slice(0, 32)}` });
    return { status: "success", at };
  } catch (error) {
    logger.error("newsletter.subscribe_failed", { error });
    return { status: "error", at };
  }
}
