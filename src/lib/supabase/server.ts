import "server-only";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@/types/database";
import { publicSupabaseEnv, isProduction } from "@/lib/env";

// Auth cookies nastavujeme httpOnly – s relací pracuje výhradně server (ochrana tokenů před XSS).
export const AUTH_COOKIE_OPTIONS: CookieOptions = { httpOnly: true, secure: isProduction, sameSite: "lax", path: "/" };

/** Klient s relací přihlášeného uživatele (RLS platí). Pro Server Components, Actions a Route Handlers. */
export async function createSupabaseServerClient() {
  const { url, anonKey } = publicSupabaseEnv();
  const cookieStore = await cookies();
  return createServerClient<Database>(url, anonKey, {
    cookieOptions: AUTH_COOKIE_OPTIONS,
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (toSet) => {
        try {
          for (const { name, value, options } of toSet) cookieStore.set(name, value, { ...options, ...AUTH_COOKIE_OPTIONS });
        } catch {
          // Server Component nesmí zapisovat cookies – obnovu relace zajišťuje proxy.
        }
      },
    },
  });
}
