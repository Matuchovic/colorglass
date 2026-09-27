import { NextResponse, type NextRequest } from "next/server";
import { isStoreCode, STORES } from "@/lib/store";
import { PREVIEW_MODE } from "@/lib/preview";
import { rateLimit } from "@/lib/security/rate-limit";
import { searchSuggest } from "@/server/catalog";
import { logger } from "@/lib/logger";

/** Našeptávač: veřejná data, krátká cache na CDN podle URL. */
export async function GET(request: NextRequest) {
  const q = (request.nextUrl.searchParams.get("q") ?? "").trim().slice(0, 80);
  const store = request.nextUrl.searchParams.get("store");
  if (!isStoreCode(store) || q.length < 2) return NextResponse.json({ products: [], categories: [], brands: [] });
  if (!PREVIEW_MODE && !(await rateLimit("search"))) {
    return NextResponse.json({ error: "RATE_LIMITED" }, { status: 429, headers: { "retry-after": "30" } });
  }
  try {
    const result = await searchSuggest(q, STORES[store].market);
    return NextResponse.json(result, { headers: { "cache-control": "public, s-maxage=60, stale-while-revalidate=300" } });
  } catch (error) {
    logger.error("api.suggest_failed", { error });
    return NextResponse.json({ products: [], categories: [], brands: [] }, { status: 503 });
  }
}
