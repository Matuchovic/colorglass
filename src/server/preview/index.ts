import "server-only";
import raw from "./snapshot.json";
import type { MarketCode } from "@/lib/store";
import type { CatalogListResult, CategoryNode, Facets, HomeSection, ProductCardData, ProductDetail, SearchSuggestions } from "@/types/catalog";
import type { Json } from "@/types/database";

// Data náhledového režimu (viz src/lib/preview.ts). Obnova: scripts/export-preview-snapshot.mjs
type ContentPage = {
  slug: string;
  title: string;
  body: string;
  seo_description: string | null;
  footer_group: string | null;
  sort_order: number;
  translations: Json;
  requires_legal_review: boolean;
  updated_at: string;
};

type IndexRow = { id: string; slug: string; created_at: string; sold_count: number; brand_slug: string | null; categories: string[]; attrs: Record<string, string[]> };

type Snapshot = {
  markets: Record<MarketCode, {
    home: HomeSection[];
    categories: Omit<CategoryNode, "children">[];
    products: ProductCardData[];
    details: Record<string, ProductDetail>;
  }>;
  index: IndexRow[];
  settings: Record<string, Json>;
  thresholds: Record<MarketCode, number | null>;
  footerPages: ContentPage[];
};

const snapshot = raw as unknown as Snapshot;

export const previewHome = (market: MarketCode) => snapshot.markets[market].home;
export const previewCategories = (market: MarketCode) => snapshot.markets[market].categories;
export const previewSettings = () => snapshot.settings;
export const previewThresholds = () => snapshot.thresholds;
export const previewContentPages = () => snapshot.footerPages;
export const previewContentPage = (slug: string) => snapshot.footerPages.find((p) => p.slug === slug) ?? null;

export function previewCards(ids: string[], market: MarketCode): ProductCardData[] {
  const all = snapshot.markets[market].products;
  return ids.map((id) => all.find((p) => p.id === id)).filter((p): p is ProductCardData => Boolean(p));
}

const normalize = (v: string) => v.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

/** Jednoduché vyhledávání nad snapshotem (v produkci řeší DB s tolerancí překlepů). */
export function previewSearch(query: string, market: MarketCode): SearchSuggestions {
  const words = normalize(query).split(/\s+/).filter((w) => w.length >= 2);
  if (!words.length) return { products: [], categories: [], brands: [] };
  const match = (text: string) => {
    const hay = normalize(text);
    return words.every((w) => hay.includes(w.slice(0, Math.max(3, w.length - 2))));
  };
  const products = snapshot.markets[market].products.filter((p) => match(`${p.name} ${p.brand?.name ?? ""}`)).slice(0, 6);
  const categories = snapshot.markets[market].categories
    .filter((c) => match(c.name))
    .slice(0, 4)
    .map((c) => ({ name: c.name, path: c.path }));
  const brands = [...new Map(snapshot.markets[market].products.filter((p) => p.brand && match(p.brand.name)).map((p) => [p.brand!.slug, p.brand!])).values()].slice(0, 4);
  return { products, categories, brands };
}

export const previewProduct = (slug: string, market: MarketCode): ProductDetail | null => snapshot.markets[market].details[slug] ?? null;
export const previewSlugs = () => snapshot.index.map((p) => p.slug);

export function previewBrand(slug: string) {
  const brand = snapshot.markets.CZ.products.find((p) => p.brand?.slug === slug)?.brand;
  return brand ? { id: slug, slug: brand.slug, name: brand.name, description: null, seo_title: null, seo_description: null, translations: {}, updated_at: new Date(0).toISOString() } : null;
}

type PreviewListParams = {
  market: MarketCode;
  categoryPath?: string;
  brandSlug?: string;
  query?: string;
  brands?: string[];
  filters?: Record<string, string[] | { min?: number; max?: number }>;
  priceMin?: number;
  priceMax?: number;
  inStock?: boolean;
  onSale?: boolean;
  minRating?: number;
  sort?: string;
  page?: number;
  perPage?: number;
};

function baseSet(p: PreviewListParams, withFilters: boolean) {
  const cards = snapshot.markets[p.market].products;
  const words = p.query ? normalize(p.query).split(/\s+/).filter((w) => w.length >= 2) : [];
  return snapshot.index
    .map((row) => ({ row, card: cards.find((c) => c.id === row.id) }))
    .filter((x): x is { row: IndexRow; card: ProductCardData } => Boolean(x.card))
    .filter(({ row, card }) => {
      if (p.categoryPath && !row.categories.some((c) => c === p.categoryPath || c.startsWith(`${p.categoryPath}/`))) return false;
      if (p.brandSlug && row.brand_slug !== p.brandSlug) return false;
      if (words.length) {
        const hay = normalize(`${card.name} ${card.brand?.name ?? ""}`);
        if (!words.every((w) => hay.includes(w.slice(0, Math.max(3, w.length - 2))))) return false;
      }
      if (!withFilters) return true;
      if (p.brands?.length && !(row.brand_slug && p.brands.includes(row.brand_slug))) return false;
      if (p.priceMin !== undefined && card.price < p.priceMin) return false;
      if (p.priceMax !== undefined && card.price > p.priceMax) return false;
      if (p.inStock && card.stock === "out_of_stock") return false;
      if (p.onSale && !card.compare_at) return false;
      if (p.minRating && card.rating_avg < p.minRating) return false;
      for (const [code, value] of Object.entries(p.filters ?? {})) {
        if (Array.isArray(value) && value.length && !value.some((v) => row.attrs[code]?.includes(v))) return false;
      }
      return true;
    });
}

export function previewList(p: PreviewListParams): CatalogListResult {
  const rows = baseSet(p, true);
  const sorted = [...rows].sort((a, b) => {
    switch (p.sort) {
      case "price_asc": return a.card.price - b.card.price;
      case "price_desc": return b.card.price - a.card.price;
      case "newest": return b.row.created_at.localeCompare(a.row.created_at);
      case "rating": return b.card.rating_avg - a.card.rating_avg || b.card.rating_count - a.card.rating_count;
      case "discount": return (b.card.compare_at ? 1 - b.card.price / b.card.compare_at : 0) - (a.card.compare_at ? 1 - a.card.price / a.card.compare_at : 0);
      default: return b.row.sold_count - a.row.sold_count || b.card.rating_count - a.card.rating_count;
    }
  });
  const perPage = p.perPage ?? 24;
  const page = Math.max(1, p.page ?? 1);
  return { total: sorted.length, page, per_page: perPage, items: sorted.slice((page - 1) * perPage, page * perPage).map((x) => x.card) };
}

export function previewFacets(p: PreviewListParams): Facets {
  const scope = baseSet(p, false);
  const filtered = baseSet(p, true);
  const brands = new Map<string, { slug: string; name: string; count: number }>();
  for (const { card } of scope) {
    if (!card.brand) continue;
    const entry = brands.get(card.brand.slug) ?? { slug: card.brand.slug, name: card.brand.name, count: 0 };
    entry.count++;
    brands.set(card.brand.slug, entry);
  }
  const prices = scope.map((x) => x.card.price);
  return {
    total: filtered.length,
    price: { min: prices.length ? Math.min(...prices) : null, max: prices.length ? Math.max(...prices) : null },
    in_stock_count: scope.filter((x) => x.card.stock !== "out_of_stock").length,
    on_sale_count: scope.filter((x) => x.card.compare_at).length,
    brands: [...brands.values()].sort((a, b) => a.name.localeCompare(b.name)),
    attributes: [],
  };
}
