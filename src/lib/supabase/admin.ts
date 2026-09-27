import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { serverEnv } from "@/lib/env";

let client: ReturnType<typeof createClient<Database>> | null = null;

/**
 * Service-role klient (obchází RLS). Používat JEN na serveru pro operace bez uživatelské relace:
 * košík přes token, checkout, webhooky plateb, cron, e-mailová fronta, rate limiting.
 */
export function supabaseAdmin() {
  if (!client) {
    const env = serverEnv();
    client = createClient<Database>(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
      global: { headers: { "x-color-client": "server" } },
    });
  }
  return client;
}
