import { NextResponse, type NextRequest } from "next/server";
import { absoluteUrl, isStoreCode, type StoreCode } from "@/lib/store";
import { PREVIEW_MODE } from "@/lib/preview";
import { sha256Hex } from "@/lib/security/crypto";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

/** Potvrzení odběru (double opt-in). Token je jednorázový, v DB je jen jeho hash. */
export async function GET(request: NextRequest) {
  const storeParam = request.nextUrl.searchParams.get("store");
  const store: StoreCode = isStoreCode(storeParam) ? storeParam : "cz";
  const token = request.nextUrl.searchParams.get("token") ?? "";
  const done = (result: "confirmed" | "invalid") => NextResponse.redirect(`${absoluteUrl(store, "/")}?newsletter=${result}`, 303);
  if (PREVIEW_MODE || !/^[A-Za-z0-9_-]{32,64}$/.test(token)) return done("invalid");
  try {
    const { data, error } = await supabaseAdmin()
      .from("newsletter_subscribers")
      .update({ status: "confirmed", confirmed_at: new Date().toISOString(), confirm_token_hash: null })
      .eq("confirm_token_hash", sha256Hex(token))
      .eq("status", "pending")
      .gte("confirm_sent_at", new Date(Date.now() - 7 * 86_400_000).toISOString())
      .select("id")
      .maybeSingle();
    if (error) throw new Error(error.message);
    return done(data ? "confirmed" : "invalid");
  } catch (error) {
    logger.error("newsletter.confirm_failed", { error });
    return done("invalid");
  }
}
