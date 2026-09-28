import { NextResponse } from "next/server";
import { isStoreCode } from "@/lib/store";
import { buildSearchIndex } from "@/server/search-index";

// Index pro našeptávač: statický, obnovuje se každých 5 minut (ISR). Prohlížeč si ho stáhne jednou a hledá okamžitě.
export const revalidate = 300;
export function generateStaticParams() {
  return [{ store: "cz" }, { store: "sk" }];
}

export async function GET(_req: Request, { params }: { params: Promise<{ store: string }> }) {
  const { store } = await params;
  if (!isStoreCode(store)) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  return NextResponse.json(await buildSearchIndex(store));
}
