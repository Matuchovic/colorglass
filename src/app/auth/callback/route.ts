import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { safeRedirectPath } from "@/lib/utils";

/** Návrat z OAuth (Google): výměna kódu za relaci. */
export async function GET(request: NextRequest) {
  const url = request.nextUrl;
  const next = safeRedirectPath(url.searchParams.get("next"), "/muj-ucet");
  const code = url.searchParams.get("code");
  if (code) {
    const supabase = await createSupabaseServerClient();
    if (!(await supabase.auth.exchangeCodeForSession(code)).error) {
      await supabase.rpc("link_guest_orders");
      return NextResponse.redirect(new URL(next, url.origin), 303);
    }
  }
  return NextResponse.redirect(new URL("/prihlaseni?chyba=oauth", url.origin), 303);
}
