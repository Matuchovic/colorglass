import "server-only";
import { cache } from "react";
import { notFound, redirect } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { storePath, type StoreCode } from "@/lib/store";
import type { Database } from "@/types/database";

export type AppRole = Database["public"]["Enums"]["app_role"];

function supabaseConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

/** Ověřený uživatel (getUser ověřuje JWT u Supabase Auth, ne jen čte cookie). Jednou za požadavek. */
export const getSessionUser = cache(async (): Promise<User | null> => {
  if (!supabaseConfigured()) return null;
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser();
  if (error) return null;
  return data.user;
});

export const getProfile = cache(async () => {
  const user = await getSessionUser();
  if (!user) return null;
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("profiles")
    .select("id, email, first_name, last_name, phone, company_name, company_id, vat_id, role, preferred_market, is_blocked")
    .eq("id", user.id)
    .single();
  return data;
});

export async function requireUser(store: StoreCode, next: string): Promise<User> {
  const user = await getSessionUser();
  if (!user) redirect(`${storePath(store, "/prihlaseni")}?next=${encodeURIComponent(next)}`);
  return user;
}

export interface StaffContext {
  userId: string;
  email: string;
  name: string;
  role: AppRole;
  permissions: Set<string>;
}

export const getStaffContext = cache(async (): Promise<StaffContext | null> => {
  const user = await getSessionUser();
  if (!user) return null;
  const supabase = await createSupabaseServerClient();
  const [{ data: profile }, { data: permissions }] = await Promise.all([
    supabase.from("profiles").select("role, first_name, last_name, email, is_blocked").eq("id", user.id).single(),
    supabase.rpc("my_permissions"),
  ]);
  if (!profile || profile.role === "customer" || profile.is_blocked) return null;
  return {
    userId: user.id,
    email: profile.email,
    name: [profile.first_name, profile.last_name].filter(Boolean).join(" ") || profile.email,
    role: profile.role,
    permissions: new Set(permissions ?? []),
  };
});

export function can(ctx: StaffContext | null, permission: string): boolean {
  return Boolean(ctx && (ctx.permissions.has("*") || ctx.permissions.has(permission)));
}

export class ForbiddenError extends Error {
  constructor(public permission: string) {
    super(`FORBIDDEN:${permission}`);
  }
}

/** Stránky administrace: nepřihlášený → login, zákazník → 404 (neprozrazujeme existenci), chybějící právo → 403 stránka. */
export async function requireStaffPage(permission?: string): Promise<StaffContext> {
  const ctx = await getStaffContext();
  if (!ctx) {
    if (!(await getSessionUser())) redirect("/admin/prihlaseni");
    notFound();
  }
  if (permission && !can(ctx, permission)) redirect(`/admin?denied=${encodeURIComponent(permission)}`);
  return ctx;
}

/** Server Actions administrace: oprávnění se ověřuje vždy na serveru (a znovu v DB přes RLS/has_perm). */
export async function requireStaffAction(permission: string): Promise<StaffContext> {
  const ctx = await getStaffContext();
  if (!ctx || !can(ctx, permission)) throw new ForbiddenError(permission);
  return ctx;
}
