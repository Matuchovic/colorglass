import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { isStoreCode, STORES } from "@/lib/store";
import { PREVIEW_MODE } from "@/lib/preview";
import { rateLimit } from "@/lib/security/rate-limit";
import { productCards } from "@/server/catalog";

const body = z.object({ store: z.string(), ids: z.array(z.uuid()).max(60) });

/** Karty produktů podle ID (oblíbené, naposledy prohlížené). Jen veřejná data. */
export async function POST(request: NextRequest) {
  const parsed = body.safeParse(await request.json().catch(() => null));
  if (!parsed.success || !isStoreCode(parsed.data.store)) return NextResponse.json({ products: [] }, { status: 400 });
  if (!PREVIEW_MODE && !(await rateLimit("search"))) return NextResponse.json({ products: [] }, { status: 429 });
  const products = await productCards(parsed.data.ids, STORES[parsed.data.store].market);
  return NextResponse.json({ products }, { headers: { "cache-control": "private, max-age=60" } });
}
