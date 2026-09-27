"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { isStoreCode, storePath, type StoreCode } from "@/lib/store";
import { PREVIEW_MODE } from "@/lib/preview";
import { rateLimit } from "@/lib/security/rate-limit";
import { addressSchema, passwordSchema, phoneSchema, returnRequestSchema, toFieldErrors, type FieldErrors } from "@/lib/validation";
import { logger } from "@/lib/logger";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getSessionUser } from "@/server/auth";

export type FormState = { status: "idle" | "ok" | "error"; code?: string; fieldErrors?: FieldErrors; at?: number };

const storeOf = (fd: FormData): StoreCode => {
  const s = String(fd.get("store") ?? "cz");
  return isStoreCode(s) ? s : "cz";
};
const str = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();

async function requireUserOrError() {
  if (PREVIEW_MODE) return null;
  return getSessionUser();
}

const profileSchema = z.object({
  first_name: z.string().trim().min(1, { error: "required" }).max(80),
  last_name: z.string().trim().min(1, { error: "required" }).max(80),
  phone: z.union([phoneSchema, z.literal("")]),
  company_name: z.string().trim().max(160),
  company_id: z.union([z.string().trim().regex(/^\d{8}$/, { error: "companyId" }), z.literal("")]),
  vat_id: z.union([z.string().trim().toUpperCase().regex(/^(CZ|SK)\d{8,10}$/, { error: "validation" }), z.literal("")]),
  preferred_market: z.enum(["CZ", "SK"]),
});

export async function updateProfileAction(_p: FormState, fd: FormData): Promise<FormState> {
  const user = await requireUserOrError();
  if (!user) return { status: "error", code: "auth" };
  const parsed = profileSchema.safeParse(Object.fromEntries(["first_name", "last_name", "phone", "company_name", "company_id", "vat_id", "preferred_market"].map((k) => [k, str(fd, k)])));
  if (!parsed.success) return { status: "error", code: "validation", fieldErrors: toFieldErrors(parsed.error) };
  const d = parsed.data;
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("profiles").update({
    first_name: d.first_name, last_name: d.last_name, phone: d.phone || null, company_name: d.company_name || null,
    company_id: d.company_id || null, vat_id: d.vat_id || null, preferred_market: d.preferred_market,
  }).eq("id", user.id);
  if (error) return { status: "error", code: "generic" };
  revalidatePath("/", "layout");
  return { status: "ok", at: Date.now() };
}

export async function changePasswordAction(_p: FormState, fd: FormData): Promise<FormState> {
  const user = await requireUserOrError();
  if (!user?.email) return { status: "error", code: "auth" };
  if (!(await rateLimit("login")) || !(await rateLimit("loginEmail", user.email))) return { status: "error", code: "rateLimited" };
  const next = passwordSchema.safeParse(fd.get("password"));
  if (!next.success) return { status: "error", code: "validation", fieldErrors: { password: "validation" } };
  if (fd.get("password") !== fd.get("password_again")) return { status: "error", code: "passwordMismatch", fieldErrors: { password_again: "validation" } };
  const supabase = await createSupabaseServerClient();
  const check = await supabase.auth.signInWithPassword({ email: user.email, password: String(fd.get("current") ?? "") });
  if (check.error) return { status: "error", code: "invalidCredentials", fieldErrors: { current: "validation" } };
  const { error } = await supabase.auth.updateUser({ password: next.data });
  if (error) return { status: "error", code: "generic" };
  return { status: "ok", at: Date.now() };
}

export async function saveAddressAction(_p: FormState, fd: FormData): Promise<FormState> {
  const user = await requireUserOrError();
  if (!user) return { status: "error", code: "auth" };
  const store = storeOf(fd);
  const parsed = addressSchema.safeParse({
    first_name: str(fd, "first_name"), last_name: str(fd, "last_name"), company: str(fd, "company"), street: str(fd, "street"),
    city: str(fd, "city"), postal_code: str(fd, "postal_code"), country: str(fd, "country") || (store === "sk" ? "SK" : "CZ"), phone: str(fd, "phone"),
  });
  if (!parsed.success) return { status: "error", code: "validation", fieldErrors: toFieldErrors(parsed.error) };
  const id = str(fd, "id");
  const defShipping = fd.get("is_default_shipping") === "on";
  const defBilling = fd.get("is_default_billing") === "on";
  const supabase = await createSupabaseServerClient();
  if (defShipping) await supabase.from("addresses").update({ is_default_shipping: false }).eq("user_id", user.id).neq("id", id || "00000000-0000-0000-0000-000000000000");
  if (defBilling) await supabase.from("addresses").update({ is_default_billing: false }).eq("user_id", user.id).neq("id", id || "00000000-0000-0000-0000-000000000000");
  const row = { ...parsed.data, company: parsed.data.company ?? null, phone: parsed.data.phone ?? null, label: str(fd, "label").slice(0, 60) || null, is_default_shipping: defShipping, is_default_billing: defBilling };
  const { error } = id && z.uuid().safeParse(id).success
    ? await supabase.from("addresses").update(row).eq("id", id)
    : await supabase.from("addresses").insert({ ...row, user_id: user.id });
  if (error) return { status: "error", code: error.message.includes("ADDRESS_LIMIT") ? "limit" : "generic" };
  revalidatePath(storePath(store, "/muj-ucet/adresy"));
  return { status: "ok", at: Date.now() };
}

export async function deleteAddressAction(fd: FormData): Promise<void> {
  const user = await requireUserOrError();
  const id = str(fd, "id");
  if (!user || !z.uuid().safeParse(id).success) return;
  const supabase = await createSupabaseServerClient();
  await supabase.from("addresses").delete().eq("id", id);
  revalidatePath(storePath(storeOf(fd), "/muj-ucet/adresy"));
}

export async function newsletterToggleAction(fd: FormData): Promise<void> {
  const user = await requireUserOrError();
  if (!user?.email) return;
  const store = storeOf(fd);
  const subscribe = fd.get("subscribe") === "1";
  const admin = supabaseAdmin();
  const email = user.email.toLowerCase();
  const now = new Date().toISOString();
  const { data: existing } = await admin.from("newsletter_subscribers").select("id").eq("email", email).maybeSingle();
  // přihlášený uživatel má ověřený e-mail → potvrzení odběru není potřeba
  const subscribed = { status: "confirmed" as const, confirmed_at: now, consent_at: now, consent_text: "Souhlas udělen v zákaznickém účtu.", user_id: user.id, source: "account", unsubscribed_at: null };
  const unsubscribed = { status: "unsubscribed" as const, unsubscribed_at: now };
  let error: { message: string } | null = null;
  if (existing) {
    ({ error } = await admin.from("newsletter_subscribers").update(subscribe ? subscribed : unsubscribed).eq("id", existing.id));
  } else if (subscribe) {
    ({ error } = await admin.from("newsletter_subscribers").insert({ ...subscribed, email, market: store === "sk" ? "SK" : "CZ", locale: store === "sk" ? "sk" : "cs" }));
  }
  if (error) logger.error("account.newsletter_failed", { message: error.message });
  revalidatePath(storePath(store, "/muj-ucet/newsletter"));
}

export async function cancelOrderAction(fd: FormData): Promise<void> {
  const user = await requireUserOrError();
  const id = str(fd, "order_id");
  const store = storeOf(fd);
  if (!user || !z.uuid().safeParse(id).success) return;
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("customer_cancel_order", { p_order_id: id });
  if (error) logger.warn("account.cancel_failed", { message: error.message });
  revalidatePath(storePath(store, "/muj-ucet/objednavky"), "layout");
  redirect(`${storePath(store, `/muj-ucet/objednavky/${str(fd, "number")}`)}${error ? "?zruseni=chyba" : "?zruseni=ok"}`);
}

export async function createReturnAction(_p: FormState, fd: FormData): Promise<FormState> {
  const user = await requireUserOrError();
  if (!user) return { status: "error", code: "auth" };
  const items = fd.getAll("item").map(String).map((itemId) => ({ order_item_id: itemId, quantity: Number(fd.get(`qty_${itemId}`) ?? 1) }));
  const parsed = returnRequestSchema.safeParse({
    order_id: str(fd, "order_id"), type: str(fd, "type"), items, reason: str(fd, "reason"), bank_account: str(fd, "bank_account"),
  });
  if (!parsed.success) return { status: "error", code: "validation", fieldErrors: toFieldErrors(parsed.error) };
  const supabase = await createSupabaseServerClient();
  const d = parsed.data;
  const { error } = await supabase.rpc("create_return_request", {
    p_order_id: d.order_id, p_type: d.type, p_items: d.items, p_reason: d.reason, p_bank_account: d.bank_account ?? null,
  });
  if (error) return { status: "error", code: error.message.includes("RETURN_WINDOW") ? "window" : "generic" };
  revalidatePath(storePath(storeOf(fd), "/muj-ucet/vraceni"));
  return { status: "ok", at: Date.now() };
}
