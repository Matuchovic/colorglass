import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { publicSupabaseEnv } from "@/lib/env";

let client: ReturnType<typeof createClient<Database>> | null = null;

/** Anonymní klient bez cookies pro veřejná, cacheovatelná data katalogu (RLS: jen aktivní obsah). */
export function supabasePublic() {
  if (!client) {
    const { url, anonKey } = publicSupabaseEnv();
    client = createClient<Database>(url, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });
  }
  return client;
}
