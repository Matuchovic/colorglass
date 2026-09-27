import type { ListParams } from "@/server/catalog";

// Parametry výpisu v URL (české názvy): razeni, strana, znacka, cena_od, cena_do, skladem, akce, a_<parametr>
export type SearchParams = Record<string, string | string[] | undefined>;

const SORTS = ["recommended", "bestselling", "newest", "price_asc", "price_desc", "rating", "discount"] as const;
export type SortKey = (typeof SORTS)[number];

const list = (v: string | string[] | undefined): string[] =>
  (Array.isArray(v) ? v : v ? [v] : []).flatMap((x) => x.split(",")).map((x) => x.trim()).filter((x) => /^[a-z0-9-]{1,80}$/.test(x)).slice(0, 30);

const money = (v: string | string[] | undefined): number | undefined => {
  const raw = Array.isArray(v) ? v[0] : v;
  if (!raw) return undefined;
  const n = Number(raw.replace(",", ".").replace(/\s/g, ""));
  return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) : undefined;
};

export function parseListing(sp: SearchParams, defaults: { sort: SortKey }) {
  const filters: Record<string, string[]> = {};
  for (const [key, value] of Object.entries(sp)) {
    if (key.startsWith("a_") && /^a_[a-z0-9_]{1,40}$/.test(key)) {
      const values = list(value);
      if (values.length) filters[key.slice(2)] = values;
    }
  }
  const sortRaw = Array.isArray(sp.razeni) ? sp.razeni[0] : sp.razeni;
  const sort: SortKey = SORTS.includes(sortRaw as SortKey) ? (sortRaw as SortKey) : defaults.sort;
  const pageRaw = Number(Array.isArray(sp.strana) ? sp.strana[0] : sp.strana);
  const params: Partial<ListParams> = {
    brands: list(sp.znacka),
    filters,
    priceMin: money(sp.cena_od),
    priceMax: money(sp.cena_do),
    inStock: sp.skladem === "1",
    onSale: sp.akce === "1" ? true : undefined,
    sort,
    page: Number.isInteger(pageRaw) && pageRaw > 0 && pageRaw < 1000 ? pageRaw : 1,
    perPage: 24,
  };
  const hasUserFilters =
    Boolean(params.brands?.length || Object.keys(filters).length || params.priceMin !== undefined || params.priceMax !== undefined || params.inStock || params.onSale) ||
    sortRaw !== undefined ||
    params.page !== 1;
  return { params, sort, hasUserFilters };
}

/** Sestaví query string z aktuálních parametrů s úpravou (null = odebrat). */
export function withParams(sp: SearchParams, changes: Record<string, string | null>): string {
  const q = new URLSearchParams();
  for (const [key, value] of Object.entries(sp)) {
    if (key in changes || value === undefined) continue;
    for (const v of Array.isArray(value) ? value : [value]) q.append(key, v);
  }
  for (const [key, value] of Object.entries(changes)) if (value !== null) q.set(key, value);
  const s = q.toString();
  return s ? `?${s}` : "";
}
