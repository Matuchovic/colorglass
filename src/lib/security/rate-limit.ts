import "server-only";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";
import { requestIpHash } from "./request";
import { sha256Hex } from "./crypto";

export const LIMITS = {
  login: { limit: 8, window: 600 },
  loginEmail: { limit: 5, window: 900 },
  register: { limit: 5, window: 3600 },
  passwordReset: { limit: 5, window: 3600 },
  newsletter: { limit: 5, window: 3600 },
  contact: { limit: 5, window: 3600 },
  review: { limit: 5, window: 3600 },
  checkout: { limit: 12, window: 600 },
  cart: { limit: 120, window: 60 },
  search: { limit: 90, window: 60 },
} as const;

export type LimitName = keyof typeof LIMITS;

/**
 * Sdílený limit napříč serverless instancemi (PostgreSQL, atomický upsert).
 * Při výpadku DB se požadavek nepropustí jen u citlivých akcí (fail-closed), jinak ano.
 */
export async function rateLimit(name: LimitName, extraKey?: string): Promise<boolean> {
  const { limit, window } = LIMITS[name];
  const ip = await requestIpHash();
  const key = `${name}:${extraKey ? sha256Hex(extraKey.toLowerCase()).slice(0, 32) : ip.slice(0, 32)}`;
  try {
    const { data, error } = await supabaseAdmin().rpc("rate_limit_hit", { p_key: key, p_limit: limit, p_window_seconds: window });
    if (error) throw error;
    return data === true;
  } catch (error) {
    logger.error("rate_limit.failed", { name, error });
    const sensitive: LimitName[] = ["login", "loginEmail", "register", "passwordReset"];
    return !sensitive.includes(name);
  }
}
