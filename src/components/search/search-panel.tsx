"use client";

import Image from "next/image";
import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import { ArrowRightIcon, StarIcon } from "@/components/icons";
import { ClockIcon, EyeIcon, PageIcon, TrendIcon } from "@/components/color/icons";
import { fmt, type Dictionary } from "@/i18n";
import type { SearchDoc, SearchHit, SearchIndex, SearchResult } from "@/lib/smart-search";
import { storePath, type StoreCode } from "@/lib/store";
import { cn } from "@/lib/utils";

export type SearchLabels = Dictionary["color"]["search"];
export type Entry = {
  key: string; href: string; label: string; q?: string; sub?: string | null; image?: string | null; price?: string | null;
  compareAt?: string | null; rating?: number; ratingCount?: number; badge?: string | null; marks?: Array<[number, number]>;
  icon?: "recent" | "trend" | "page" | "test" | "search" | "all";
};
export type Section = { id: string; title?: string; layout: "chips" | "rows" | "tiles" | "all"; items: Entry[]; clearable?: boolean };

const hrefFor = (q: string) => `/hledat?q=${encodeURIComponent(q)}`;
const fromDoc = (d: SearchDoc, marks?: Array<[number, number]>): Entry => ({
  key: d.id, href: d.href, label: d.title, sub: d.subtitle, image: d.image, price: d.price, compareAt: d.compareAt,
  rating: d.rating, ratingCount: d.ratingCount, badge: d.badge, marks, icon: d.kind === "page" ? (d.href === "/colortest" ? "test" : "page") : undefined,
});
const fromHit = (h: SearchHit) => fromDoc(h.doc, h.marks);

/** Obsah panelu pro prázdné pole i pro dotaz. Stejné pořadí slouží i pro ovládání šipkami. */
export function buildSections(index: SearchIndex | null, result: SearchResult | null, query: string, recent: string[], labels: SearchLabels): Section[] {
  if (!index) return [];
  const popular: Section = { id: "popular", title: labels.popular, layout: "chips", items: index.popular.map((p) => ({ key: `p:${p}`, href: hrefFor(p), label: p, q: p, icon: "trend" })) };
  if (!query.trim()) {
    const out: Section[] = [];
    if (recent.length) out.push({ id: "recent", title: labels.recent, layout: "chips", clearable: true, items: recent.map((r) => ({ key: `r:${r}`, href: hrefFor(r), label: r, q: r, icon: "recent" })) });
    out.push(popular);
    out.push({ id: "cats", title: labels.categories, layout: "tiles", items: index.docs.filter((d) => d.kind === "category" && d.href.split("/").length > 3).map((d) => fromDoc(d)) });
    out.push({ id: "best", title: labels.bestsellers, layout: "rows", items: index.docs.filter((d) => d.kind === "product").sort((a, b) => b.popularity - a.popularity).slice(0, 4).map((d) => fromDoc(d)) });
    return out;
  }
  if (!result) return [];
  if (!result.products.length && !result.categories.length && !result.pages.length) {
    const out: Section[] = [];
    if (result.corrected) out.push({ id: "dym", layout: "chips", items: [{ key: "dym", href: hrefFor(result.corrected), label: fmt(labels.didYouMean, { query: result.corrected }), q: result.corrected, icon: "search" }] });
    out.push(popular);
    return out;
  }
  const out: Section[] = [];
  if (result.categories.length) out.push({ id: "cats", title: labels.categories, layout: "chips", items: result.categories.map(fromHit) });
  if (result.products.length) out.push({ id: "products", title: labels.products, layout: "rows", items: result.products.map(fromHit) });
  if (result.pages.length) out.push({ id: "pages", title: labels.pages, layout: "rows", items: result.pages.map(fromHit) });
  out.push({ id: "all", layout: "all", items: [{ key: "all", href: hrefFor(query.trim()), label: `${labels.showAll} (${result.total})`, icon: "all" }] });
  return out;
}

function Marked({ text, marks }: { text: string; marks?: Array<[number, number]> }) {
  if (!marks?.length) return <>{text}</>;
  const out: ReactNode[] = [];
  let last = 0;
  [...marks].sort((a, b) => a[0] - b[0]).forEach(([s, e], i) => {
    if (s < last) return;
    if (s > last) out.push(text.slice(last, s));
    out.push(<mark key={i} className="rounded-sm bg-transparent font-extrabold text-brand-700">{text.slice(s, e)}</mark>);
    last = e;
  });
  if (last < text.length) out.push(text.slice(last));
  return <>{out}</>;
}

const ICONS = { recent: ClockIcon, trend: TrendIcon, page: PageIcon, test: EyeIcon, search: TrendIcon, all: ArrowRightIcon } as const;

export function SearchPanel({ store, labels, sections, active, setActive, onChoose, onClearRecent, listId, query, noResults, loading }: {
  store: StoreCode; labels: SearchLabels; sections: Section[]; active: number; setActive: (i: number) => void;
  onChoose: (entry: Entry) => void; onClearRecent: () => void; listId: string; query: string; noResults: boolean; loading: boolean;
}) {
  if (loading) {
    return (
      <div className="space-y-2 p-2" aria-busy="true" aria-label={labels.loading}>
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-3 rounded-2xl p-2">
            <span className="size-14 animate-pulse rounded-xl bg-ink-100" />
            <span className="flex-1 space-y-2"><span className="block h-3.5 w-2/3 animate-pulse rounded bg-ink-100" /><span className="block h-3 w-1/3 animate-pulse rounded bg-ink-100" /></span>
          </div>
        ))}
      </div>
    );
  }
  // Pořadové číslo položky napříč sekcemi (pro šipky a aria-activedescendant)
  const offsets = sections.map((_, si) => sections.slice(0, si).reduce((a, x) => a + x.items.length, 0));
  const optionProps = (e: Entry, i: number) => {
    return {
      id: `${listId}-${i}`, role: "option" as const, "aria-selected": active === i,
      onMouseMove: () => { if (active !== i) setActive(i); },
      style: { "--si": i } as CSSProperties,
      onClick: () => onChoose(e),
    };
  };
  return (
    <div id={listId} role="listbox" aria-label={labels.label} className="space-y-4 p-1.5">
      {noResults && (
        <div className="search-item px-3 pb-1 pt-3 text-center">
          <p className="font-display text-[17px] font-bold text-ink-900">{fmt(labels.noResults, { query })}</p>
          <p className="mx-auto mt-1 max-w-sm text-[13.5px] text-ink-500">{labels.noResultsHint}</p>
        </div>
      )}
      {sections.map((s, si) => (
        <section key={s.id} aria-label={s.title ?? s.id}>
          {s.title && (
            <div className="mb-1.5 flex items-center justify-between px-3">
              <h3 className="text-[11.5px] font-bold uppercase tracking-[0.14em] text-ink-400">{s.title}</h3>
              {s.clearable && <button type="button" onClick={onClearRecent} className="text-[12px] font-semibold text-brand-700 hover:underline">{labels.clearRecent}</button>}
            </div>
          )}
          {s.layout === "chips" && (
            <div className="flex flex-wrap gap-2 px-2">
              {s.items.map((e, k) => {
                const Icon = e.icon ? ICONS[e.icon] : null;
                const p = optionProps(e, offsets[si]! + k);
                const cls = cn("search-item inline-flex h-10 items-center gap-2 rounded-full border px-3.5 text-[14px] font-medium transition active:scale-[0.97]",
                    p["aria-selected"] ? "border-brand-300 bg-brand-50 text-brand-800" : "border-ink-100 bg-white text-ink-800 hover:border-brand-200");
                  const inner = (
                    <>
                      {e.image ? <span className="relative -ml-1.5 size-7 overflow-hidden rounded-full bg-tile"><Image src={e.image} alt="" fill sizes="28px" className="object-contain" /></span> : Icon ? <Icon size={15} className="text-ink-400" /> : null}
                      <Marked text={e.label} marks={e.marks} />
                    </>
                  );
                  // Dotazové „chipy“ jen vyplní pole (okamžité výsledky), odkazy vedou na stránku
                  return e.q !== undefined
                    ? <button key={e.key} type="button" {...p} className={cls}>{inner}</button>
                    : <Link key={e.key} href={storePath(store, e.href)} {...p} className={cls}>{inner}</Link>;
              })}
            </div>
          )}
          {s.layout === "tiles" && (
            <div className="grid grid-cols-2 gap-2 px-2 sm:grid-cols-4">
              {s.items.map((e, k) => {
                const p = optionProps(e, offsets[si]! + k);
                return (
                  <Link key={e.key} href={storePath(store, e.href)} {...p}
                    className={cn("search-item group flex flex-col items-center rounded-2xl border p-2.5 text-center transition active:scale-[0.97]", p["aria-selected"] ? "border-brand-300 bg-brand-50" : "border-transparent bg-tile hover:bg-white hover:shadow-md")}>
                    <span className="relative h-12 w-full">{e.image && <Image src={e.image} alt="" fill sizes="120px" className="object-contain transition duration-500 group-hover:-rotate-6 group-hover:scale-110" />}</span>
                    <span className="mt-1.5 font-display text-[13.5px] font-bold text-ink-900">{e.label}</span>
                  </Link>
                );
              })}
            </div>
          )}
          {s.layout === "rows" && (
            <div className="space-y-0.5">
              {s.items.map((e, k) => {
                const Icon = e.icon ? ICONS[e.icon] : null;
                const p = optionProps(e, offsets[si]! + k);
                return (
                  <Link key={e.key} href={storePath(store, e.href)} {...p}
                    className={cn("search-item group flex items-center gap-3 rounded-2xl px-2.5 py-2 transition active:scale-[0.99]", p["aria-selected"] ? "bg-[#eef3ff]" : "hover:bg-[#f5f7fc]")}>
                    <span className="relative grid size-14 shrink-0 place-items-center overflow-hidden rounded-xl bg-tile text-brand-600">
                      {e.image ? <Image src={e.image} alt="" fill sizes="56px" className="object-contain p-1 transition duration-500 group-hover:scale-110" /> : Icon ? <Icon size={22} /> : null}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-display text-[15px] font-semibold text-ink-900"><Marked text={e.label} marks={e.marks} /></span>
                      {e.sub && <span className="mt-0.5 block truncate text-[12.5px] text-ink-500">{e.sub}</span>}
                      {!!e.ratingCount && (
                        <span className="mt-0.5 flex items-center gap-1 text-[12px] text-ink-500"><StarIcon size={13} className="text-star" /><b className="font-semibold text-ink-700">{e.rating?.toFixed(1).replace(".", ",")}</b>({e.ratingCount}){e.badge && <span className="ml-1 rounded-full bg-success-500/10 px-1.5 text-[11px] font-semibold text-success-600">{e.badge}</span>}</span>
                      )}
                    </span>
                    {e.price && (
                      <span className="shrink-0 text-right">
                        <span className="block font-display text-[15px] font-bold text-ink-950">{e.price}</span>
                        {e.compareAt && <span className="block text-[12px] text-ink-400 line-through">{e.compareAt}</span>}
                      </span>
                    )}
                    <ArrowRightIcon size={16} className={cn("shrink-0 text-brand-600 transition", p["aria-selected"] ? "translate-x-0 opacity-100" : "-translate-x-1 opacity-0")} />
                  </Link>
                );
              })}
            </div>
          )}
          {s.layout === "all" && s.items.map((e, k) => {
            const p = optionProps(e, offsets[si]! + k);
            return (
              <Link key={e.key} href={storePath(store, e.href)} {...p}
                className={cn("search-item flex h-12 items-center justify-center gap-2 rounded-2xl text-[14.5px] font-semibold transition", p["aria-selected"] ? "bg-brand-600 text-white" : "bg-[#f1f5fe] text-brand-700 hover:bg-brand-50")}>
                {e.label}<ArrowRightIcon size={16} />
              </Link>
            );
          })}
        </section>
      ))}
    </div>
  );
}
