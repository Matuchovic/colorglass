import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { safeRedirectPath } from "@/lib/utils";

const TYPES: EmailOtpType[] = ["signup", "invite", "magiclink", "recovery", "email_change", "email"];

/**
 * Potvrzení e-mailu / obnova hesla. Podporuje odkaz s token_hash (doporučeno – funguje i na jiném zařízení,
 * viz supabase/templates) i PKCE ?code=. Přesměrování jen na interní cestu (ochrana proti open redirectu).
 */
export async function GET(request: NextRequest) {
  const url = request.nextUrl;
  const next = safeRedirectPath(url.searchParams.get("next"), "/muj-ucet");
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type") as EmailOtpType | null;
  const code = url.searchParams.get("code");
  const supabase = await createSupabaseServerClient();
  let ok = false;
  if (tokenHash && type && TYPES.includes(type)) ok = !(await supabase.auth.verifyOtp({ type, token_hash: tokenHash })).error;
  else if (code) ok = !(await supabase.auth.exchangeCodeForSession(code)).error;
  if (!ok) {
    const store = next.startsWith("/sk/") || next === "/sk" ? "/sk" : "";
    return NextResponse.redirect(new URL(`${store}/prihlaseni?chyba=odkaz`, url.origin), 303);
  }
  await supabase.rpc("link_guest_orders");
  const target = new URL(next, url.origin);
  if (type !== "recovery") target.searchParams.set("potvrzeno", "1");
  return NextResponse.redirect(target, 303);
}
