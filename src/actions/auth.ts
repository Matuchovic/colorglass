"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { isStoreCode, siteUrl, storePath, type StoreCode } from "@/lib/store";
import { PREVIEW_MODE } from "@/lib/preview";
import { rateLimit } from "@/lib/security/rate-limit";
import { emailSchema, loginSchema, passwordSchema, registerSchema, toFieldErrors, type FieldErrors } from "@/lib/validation";
import { safeRedirectPath } from "@/lib/utils";
import { logger } from "@/lib/logger";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type AuthState = { status: "idle" | "error" | "success"; code?: string; fieldErrors?: FieldErrors; email?: string };

const storeOf = (fd: FormData): StoreCode => {
  const s = String(fd.get("store") ?? "cz");
  return isStoreCode(s) ? s : "cz";
};

export async function loginAction(_prev: AuthState, fd: FormData): Promise<AuthState> {
  const store = storeOf(fd);
  if (PREVIEW_MODE) return { status: "error", code: "preview" };
  const parsed = loginSchema.safeParse({ email: fd.get("email"), password: fd.get("password") });
  if (!parsed.success) return { status: "error", code: "validation", fieldErrors: toFieldErrors(parsed.error) };
  if (!(await rateLimit("login")) || !(await rateLimit("loginEmail", parsed.data.email))) return { status: "error", code: "rateLimited" };
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) return { status: "error", code: error.code === "email_not_confirmed" ? "emailNotConfirmed" : "invalidCredentials" };
  await supabase.rpc("link_guest_orders");
  if (fd.get("mode") === "panel") return { status: "success" };
  redirect(safeRedirectPath(fd.get("next"), storePath(store, "/muj-ucet")));
}

export async function registerAction(_prev: AuthState, fd: FormData): Promise<AuthState> {
  const store = storeOf(fd);
  if (PREVIEW_MODE) return { status: "error", code: "preview" };
  const parsed = registerSchema.safeParse({
    first_name: fd.get("first_name"),
    last_name: fd.get("last_name"),
    email: fd.get("email"),
    password: fd.get("password"),
    marketing_consent: fd.get("marketing") === "on",
  });
  if (!parsed.success) return { status: "error", code: "validation", fieldErrors: toFieldErrors(parsed.error) };
  if (fd.get("password") !== fd.get("password_again")) return { status: "error", code: "passwordMismatch", fieldErrors: { password_again: "validation" } };
  if (!(await rateLimit("register"))) return { status: "error", code: "rateLimited" };
  const { email, password, first_name, last_name, marketing_consent } = parsed.data;
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { first_name, last_name, marketing_consent: Boolean(marketing_consent) },
      emailRedirectTo: `${siteUrl(store)}/auth/confirm?next=${encodeURIComponent(storePath(store, "/muj-ucet"))}`,
    },
  });
  if (error && error.code !== "user_already_exists") {
    logger.warn("auth.register_failed", { code: error.code });
    return { status: "error", code: error.code === "weak_password" ? "validation" : "generic" };
  }
  if (data.session) {
    await supabase.rpc("link_guest_orders");
    redirect(storePath(store, "/muj-ucet"));
  }
  // i pro již existující e-mail stejná odpověď – nevyzrazujeme, kdo u nás má účet
  return { status: "success", email };
}

export async function forgotPasswordAction(_prev: AuthState, fd: FormData): Promise<AuthState> {
  const store = storeOf(fd);
  if (PREVIEW_MODE) return { status: "error", code: "preview" };
  const parsed = z.object({ email: emailSchema }).safeParse({ email: fd.get("email") });
  if (!parsed.success) return { status: "error", code: "validation", fieldErrors: toFieldErrors(parsed.error) };
  if (!(await rateLimit("passwordReset")) || !(await rateLimit("passwordReset", parsed.data.email))) return { status: "error", code: "rateLimited" };
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${siteUrl(store)}/auth/confirm?next=${encodeURIComponent(storePath(store, "/nove-heslo"))}`,
  });
  if (error) logger.warn("auth.reset_failed", { code: error.code });
  return { status: "success", email: parsed.data.email };
}

export async function resetPasswordAction(_prev: AuthState, fd: FormData): Promise<AuthState> {
  const store = storeOf(fd);
  if (PREVIEW_MODE) return { status: "error", code: "preview" };
  const parsed = passwordSchema.safeParse(fd.get("password"));
  if (!parsed.success) return { status: "error", code: "validation", fieldErrors: { password: "validation" } };
  if (fd.get("password") !== fd.get("password_again")) return { status: "error", code: "passwordMismatch", fieldErrors: { password_again: "validation" } };
  const supabase = await createSupabaseServerClient();
  const { data: user } = await supabase.auth.getUser();
  if (!user.user) return { status: "error", code: "linkInvalid" };
  const { error } = await supabase.auth.updateUser({ password: parsed.data });
  if (error) return { status: "error", code: error.code === "same_password" ? "validation" : "generic" };
  redirect(`${storePath(store, "/muj-ucet")}?heslo=nastaveno`);
}

export async function logoutAction(fd: FormData): Promise<void> {
  const store = storeOf(fd);
  if (!PREVIEW_MODE) {
    const supabase = await createSupabaseServerClient();
    await supabase.auth.signOut();
  }
  redirect(storePath(store, "/"));
}

export async function googleSignInAction(fd: FormData): Promise<void> {
  const store = storeOf(fd);
  if (PREVIEW_MODE || process.env.NEXT_PUBLIC_AUTH_GOOGLE !== "true") redirect(storePath(store, "/prihlaseni"));
  const next = safeRedirectPath(fd.get("next"), storePath(store, "/muj-ucet"));
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: `${siteUrl(store)}/auth/callback?next=${encodeURIComponent(next)}` },
  });
  if (error || !data.url) redirect(`${storePath(store, "/prihlaseni")}?chyba=oauth`);
  redirect(data.url);
}
