import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ColorTest } from "@/components/colortest/color-test";
import { getDictionary } from "@/i18n";
import { absoluteUrl, isStoreCode, storePath, STORES } from "@/lib/store";
import { getPublicSettings, listProducts } from "@/server/catalog";

export const revalidate = 300;
type Props = { params: Promise<{ store: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { store: code } = await params;
  if (!isStoreCode(code)) return {};
  const c = getDictionary(STORES[code].locale).color.colortest;
  return {
    title: c.metaTitle,
    description: c.metaDescription,
    alternates: { canonical: absoluteUrl(code, "/colortest"), languages: { "cs-CZ": absoluteUrl("cz", "/colortest"), "sk-SK": absoluteUrl("sk", "/colortest") } },
  };
}

export default async function ColorTestPage({ params }: Props) {
  const { store: code } = await params;
  if (!isStoreCode(code)) notFound();
  const store = STORES[code];
  const t = getDictionary(store.locale);
  const list = (path: string, perPage: number) => listProducts({ market: store.market, categoryPath: path, sort: "bestselling", page: 1, perPage });
  const [protan, deutan, tritan, all, settings] = await Promise.all([list("bryle/protan", 12), list("bryle/deutan", 12), list("bryle/tritan", 3), list("bryle", 3), getPublicSettings()]);
  const deutanIds = new Set(deutan.items.map((p) => p.id));
  const universal = protan.items.filter((p) => deutanIds.has(p.id));
  return (
    <div className="container-page py-8 lg:py-12">
      <header className="max-w-[760px]">
        <p className="inline-flex items-center gap-2 rounded-full bg-brand-50 px-3 py-1 text-[12px] font-bold uppercase tracking-[0.16em] text-brand-700">
          ColorTest <span className="rounded-full bg-brand-600 px-2 py-0.5 text-[10px] tracking-normal text-white">{t.color.nav.newBadge}</span>
        </p>
        <h1 className="mt-4 font-display text-[34px] font-extrabold leading-tight tracking-[-0.015em] text-ink-950 sm:text-[42px]">{t.color.colortest.title}</h1>
        <p className="mt-3 text-[17px] leading-relaxed text-ink-700">{t.color.colortest.intro}</p>
      </header>
      <div className="mt-8">
        <ColorTest t={t} store={store} showAltPrice={settings.showSecondaryCurrency} links={{ all: storePath(code, "/kategorie/bryle"), how: storePath(code, "/jak-to-funguje") }}
          recommendations={{ protan: protan.items.slice(0, 3), deutan: deutan.items.slice(0, 3), redgreen: universal.slice(0, 3), tritan: tritan.items, all: all.items }} />
      </div>
    </div>
  );
}
