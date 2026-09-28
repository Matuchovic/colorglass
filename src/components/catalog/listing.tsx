import Link from "next/link";
import type { CSSProperties } from "react";
import { ChevronLeftIcon, ChevronRightIcon } from "@/components/icons";
import { ProductCard } from "@/components/product/product-card";
import { SortSelect } from "./sort-select";
import { btnPrimary } from "@/components/ui/styles";
import { plural, fmt, type Dictionary } from "@/i18n";
import { parseListing, withParams, type SearchParams, type SortKey } from "@/lib/listing-params";
import { getFacets, getPublicSettings, listProducts, type ListParams } from "@/server/catalog";
import type { StoreConfig } from "@/lib/store";
import type { Facets } from "@/types/catalog";

type Props = {
  store: StoreConfig;
  t: Dictionary;
  path: string;
  base: Omit<ListParams, "market">;
  searchParams: SearchParams;
  defaultSort?: SortKey;
  keep?: Array<[string, string]>;
};

function FilterForm({ store, t, path, facets, sp, keep, fixedOnSale }: {
  store: StoreConfig; t: Dictionary; path: string; facets: Facets; sp: SearchParams; keep: Array<[string, string]>; fixedOnSale: boolean;
}) {
  const selected = (key: string) => (Array.isArray(sp[key]) ? (sp[key] as string[]) : sp[key] ? [sp[key] as string] : []).flatMap((v) => v.split(","));
  const currencySymbol = store.currency === "CZK" ? "Kč" : "€";
  const box = "flex cursor-pointer items-center gap-2.5 rounded-md py-1.5 text-sm text-ink-800 hover:text-ink-900";
  const check = "size-4 shrink-0 rounded accent-brand-600";
  return (
    <form method="get" action={path} className="space-y-6">
      {keep.map(([name, value]) => <input key={name} type="hidden" name={name} value={value} />)}
      {sp.razeni && <input type="hidden" name="razeni" value={String(sp.razeni)} />}
      <fieldset>
        <legend className="mb-2 text-sm font-bold text-ink-900">{fmt(t.listing.priceCurrency, { currency: currencySymbol })}</legend>
        <div className="flex items-center gap-2">
          <input type="number" name="cena_od" min={0} inputMode="numeric" aria-label={t.listing.priceFrom}
            placeholder={facets.price.min !== null ? String(Math.floor(facets.price.min / 100)) : t.listing.priceFrom}
            defaultValue={typeof sp.cena_od === "string" ? sp.cena_od : ""}
            className="h-10 w-full rounded-field bg-white px-3 text-sm ring-1 ring-ink-200 focus:outline-none focus:ring-2 focus:ring-brand-600" />
          <span className="text-ink-400">–</span>
          <input type="number" name="cena_do" min={0} inputMode="numeric" aria-label={t.listing.priceTo}
            placeholder={facets.price.max !== null ? String(Math.ceil(facets.price.max / 100)) : t.listing.priceTo}
            defaultValue={typeof sp.cena_do === "string" ? sp.cena_do : ""}
            className="h-10 w-full rounded-field bg-white px-3 text-sm ring-1 ring-ink-200 focus:outline-none focus:ring-2 focus:ring-brand-600" />
        </div>
      </fieldset>
      <fieldset>
        <legend className="mb-1 text-sm font-bold text-ink-900">{t.listing.availability}</legend>
        <label className={box}>
          <input type="checkbox" name="skladem" value="1" defaultChecked={sp.skladem === "1"} className={check} />
          {t.listing.inStockOnly} <span className="text-ink-400">({facets.in_stock_count})</span>
        </label>
        {!fixedOnSale && facets.on_sale_count > 0 && (
          <label className={box}>
            <input type="checkbox" name="akce" value="1" defaultChecked={sp.akce === "1"} className={check} />
            {t.listing.onSale} <span className="text-ink-400">({facets.on_sale_count})</span>
          </label>
        )}
      </fieldset>
      {facets.brands.length > 1 && (
        <fieldset>
          <legend className="mb-1 text-sm font-bold text-ink-900">{t.listing.brand}</legend>
          {facets.brands.map((b) => (
            <label key={b.slug} className={box}>
              <input type="checkbox" name="znacka" value={b.slug} defaultChecked={selected("znacka").includes(b.slug)} className={check} />
              {b.name} <span className="text-ink-400">({b.count})</span>
            </label>
          ))}
        </fieldset>
      )}
      {facets.attributes
        .filter((a) => (a.type === "select" || a.type === "multiselect") && a.values.length > 0)
        .map((a) => (
          <fieldset key={a.code}>
            <legend className="mb-1 text-sm font-bold text-ink-900">{a.name}</legend>
            {a.values.map((v) => (
              <label key={v.slug} className={box}>
                <input type="checkbox" name={`a_${a.code}`} value={v.slug} defaultChecked={selected(`a_${a.code}`).includes(v.slug)} className={check} />
                {v.color && <span aria-hidden="true" className="size-4 rounded-full ring-1 ring-ink-200" style={{ backgroundColor: v.color }} />}
                {v.label} <span className="text-ink-400">({v.count})</span>
              </label>
            ))}
          </fieldset>
        ))}
      <div className="flex flex-col gap-2">
        <button type="submit" className={`${btnPrimary} h-11 w-full`}>{t.listing.showResults}</button>
        <Link href={`${path}${keep.length ? `?${new URLSearchParams(keep)}` : ""}`} className="py-2 text-center text-sm font-semibold text-ink-600 hover:text-brand-700">
          {t.listing.clearFilters}
        </Link>
      </div>
    </form>
  );
}

/** Výpis produktů: filtry (fasety z DB), řazení, stránkování. Použito v kategorii, značce, hledání a kolekcích. */
export async function Listing({ store, t, path, base, searchParams, defaultSort = "recommended", keep = [] }: Props) {
  const { params } = parseListing(searchParams, { sort: defaultSort });
  const full: ListParams = { ...base, ...params, onSale: base.onSale || params.onSale, market: store.market };
  const [result, facets, settings] = await Promise.all([listProducts(full), getFacets(full), getPublicSettings()]);
  const pages = Math.max(1, Math.ceil(result.total / result.per_page));
  const sortOptions = (Object.keys(t.listing.sortOptions) as SortKey[]).map((value) => ({ value, label: t.listing.sortOptions[value] }));
  const hidden = Object.entries(searchParams)
    .filter(([k, v]) => k !== "razeni" && k !== "strana" && v !== undefined)
    .flatMap(([k, v]) => (Array.isArray(v) ? v.map((x) => [k, x] as [string, string]) : [[k, v as string] as [string, string]]));
  const filterForm = <FilterForm store={store} t={t} path={path} facets={facets} sp={searchParams} keep={keep} fixedOnSale={Boolean(base.onSale)} />;

  return (
    <div className="grid gap-6 lg:grid-cols-[250px_1fr] lg:gap-10">
      <aside className="hidden lg:block" aria-label={t.listing.filters}>{filterForm}</aside>
      <div className="min-w-0">
        <details className="mb-4 rounded-card bg-surface p-4 lg:hidden">
          <summary className="cursor-pointer font-semibold text-ink-900">{t.listing.filters}</summary>
          <div className="mt-4">{filterForm}</div>
        </details>
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-ink-600">{plural(store.locale, t.listing.results, result.total)}</p>
          <SortSelect action={path} label={t.listing.sort} current={full.sort ?? defaultSort} options={sortOptions} hidden={hidden} applyLabel={t.listing.apply} />
        </div>
        {result.items.length === 0 ? (
          <div className="rounded-card bg-surface px-6 py-14 text-center">
            <p className="text-lg font-bold text-ink-900">{t.listing.emptyTitle}</p>
            <p className="mt-2 text-ink-600">{t.listing.emptyText}</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 xl:grid-cols-4">
            {result.items.map((p, i) => (
              <div key={p.id} data-reveal="" className="h-full" style={{ "--rd": `${(i % 4) * 70}ms` } as CSSProperties}><ProductCard product={p} store={store} t={t} showAltPrice={settings.showSecondaryCurrency} priority={i < 4} /></div>
            ))}
          </div>
        )}
        {pages > 1 && (
          <nav aria-label={fmt(t.listing.pageOf, { page: result.page, pages })} className="mt-10 flex items-center justify-center gap-1.5">
            {result.page > 1 && (
              <Link rel="prev" href={`${path}${withParams(searchParams, { strana: result.page - 1 === 1 ? null : String(result.page - 1) })}`}
                aria-label={t.common.previous} className="grid size-10 place-items-center rounded-btn ring-1 ring-ink-200 hover:bg-surface">
                <ChevronLeftIcon size={18} />
              </Link>
            )}
            {Array.from({ length: pages }, (_, i) => i + 1)
              .filter((n) => n === 1 || n === pages || Math.abs(n - result.page) <= 1)
              .map((n, i, arr) => (
                <span key={n} className="flex items-center gap-1.5">
                  {i > 0 && n - arr[i - 1]! > 1 && <span className="px-1 text-ink-400">…</span>}
                  <Link href={`${path}${withParams(searchParams, { strana: n === 1 ? null : String(n) })}`} aria-current={n === result.page ? "page" : undefined}
                    className={`grid size-10 place-items-center rounded-btn text-sm font-semibold ${n === result.page ? "bg-brand-600 text-white" : "ring-1 ring-ink-200 hover:bg-surface"}`}>
                    {n}
                  </Link>
                </span>
              ))}
            {result.page < pages && (
              <Link rel="next" href={`${path}${withParams(searchParams, { strana: String(result.page + 1) })}`}
                aria-label={t.common.next} className="grid size-10 place-items-center rounded-btn ring-1 ring-ink-200 hover:bg-surface">
                <ChevronRightIcon size={18} />
              </Link>
            )}
          </nav>
        )}
      </div>
    </div>
  );
}
