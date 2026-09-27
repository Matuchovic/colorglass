import { NextResponse, type NextRequest } from "next/server";
import { isStoreCode, STORES } from "@/lib/store";
import { PREVIEW_MODE } from "@/lib/preview";
import { cartCount } from "@/server/cart";
import { getProfile } from "@/server/auth";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

/** Stav pro hlavičku: počet kusů v košíku a přihlášený uživatel (jen jméno). Košík i relace z httpOnly cookies. */
export async function GET(request: NextRequest) {
  const store = request.nextUrl.searchParams.get("store");
  const headers = { "cache-control": "private, no-store" };
  if (PREVIEW_MODE || !isStoreCode(store)) return NextResponse.json({ count: 0, user: null }, { headers });
  try {
    const [count, profile] = await Promise.all([cartCount(STORES[store].market), getProfile()]);
    const user = profile ? { name: profile.first_name || profile.email.split("@")[0] || "" } : null;
    return NextResponse.json({ count, user }, { headers });
  } catch (error) {
    logger.error("api.cart_failed", { error });
    return NextResponse.json({ count: 0, user: null }, { status: 503, headers });
  }
}
