import "server-only";
import { unstable_cache } from "next/cache";
import { supabasePublic } from "@/lib/supabase/public";
import { PREVIEW_MODE } from "@/lib/preview";
import * as preview from "./preview";
import type { MarketCode } from "@/lib/store";
import type {
  CatalogListResult, CategoryNode, Facets, HomeSection, ProductCardData, ProductDetail, SearchSuggestions,
} from "@/types/catalog";
import type { Json } from "@/types/database";

// Značky cache pro cílenou revalidaci z administrace
export const TAGS = {
  catalog: "catalog",
  home: "home",
  categories: "categories",
  content: "content",
  settings: "settings",
  product: (slug: string) => `product:${slug}`,
} as const;

function cast<T>(data: Json | null): T {
  return data as unknown as T;
}

async function rpcOrThrow<T>(promise: PromiseLike<{ data: Json | null; error: { message: string } | null }>): Promise<T> {
  const { data, error } = await promise;
  if (error) throw new Error(`Databázový dotaz selhal: ${error.message}`);
  return cast<T>(data);
}

export const getCategoriesFlat = unstable_cache(
  async (market: MarketCode) =>
    PREVIEW_MODE
      ? preview.previewCategories(market)
      : rpcOrThrow<Omit<CategoryNode, "children">[]>(supabasePublic().rpc("storefront_categories", { p_market: market })),
  ["storefront-categories"],
  { tags: [TAGS.catalog, TAGS.categories], revalidate: 3600 },
);

export function buildTree(flat: Omit<CategoryNode, "children">[]): CategoryNode[] {
  const byId = new Map<string, CategoryNode>();
  for (const c of flat) byId.set(c.id, { ...c, children: [] });
  const roots: CategoryNode[] = [];
  for (const node of byId.values()) {
    const parent = node.parent_id ? byId.get(node.parent_id) : undefined;
    if (parent) parent.children.push(node);
    else if (!node.parent_id) roots.push(node);
  }
  return roots;
}

export async function getCategoryTree(market: MarketCode): Promise<CategoryNode[]> {
  return buildTree(await getCategoriesFlat(market));
}

export async function getCategoryByPath(market: MarketCode, path: string) {
  const flat = await getCategoriesFlat(market);
  const category = flat.find((c) => c.path === path);
  if (!category) return null;
  const tree = buildTree(flat);
  const find = (nodes: CategoryNode[]): CategoryNode | undefined => {
    for (const n of nodes) {
      if (n.id === category.id) return n;
      const hit = find(n.children);
      if (hit) return hit;
    }
    return undefined;
  };
  const node = find(tree) ?? { ...category, children: [] };
  const ancestors = flat
    .filter((c) => category.path.startsWith(`${c.path}/`))
    .sort((a, b) => a.depth - b.depth)
    .map((c) => ({ name: c.name, path: c.path }));
  return { category: node, ancestors };
}

export const getHome = unstable_cache(
  async (market: MarketCode) => {
    if (PREVIEW_MODE) return preview.previewHome(market);
    const res = await rpcOrThrow<{ sections: HomeSection[] }>(supabasePublic().rpc("storefront_home", { p_market: market }));
    return res.sections;
  },
  ["storefront-home"],
  { tags: [TAGS.catalog, TAGS.home], revalidate: 300 },
);

export const getProduct = unstable_cache(
  async (slug: string, market: MarketCode) =>
    PREVIEW_MODE
      ? preview.previewProduct(slug, market)
      : rpcOrThrow<ProductDetail | null>(supabasePublic().rpc("catalog_product", { p_slug: slug, p_market: market })),
  ["catalog-product"],
  { tags: [TAGS.catalog], revalidate: 300 },
);

export interface ListParams {
  market: MarketCode;
  categoryPath?: string;
  brandSlug?: string;
  query?: string;
  brands?: string[];
  filters?: Record<string, string[] | { min?: number; max?: number }>;
  priceMin?: number;
  priceMax?: number;
  inStock?: boolean;
  minRating?: number;
  onSale?: boolean;
  sort?: string;
  page?: number;
  perPage?: number;
}

function listArgs(p: ListParams) {
  return {
    p_market: p.market,
    p_category_path: p.categoryPath,
    p_brand_slug: p.brandSlug,
    p_query: p.query,
    p_brands: p.brands ?? [],
    p_filters: (p.filters ?? {}) as Json,
    p_price_min: p.priceMin,
    p_price_max: p.priceMax,
    p_in_stock: p.inStock ?? false,
    p_min_rating: p.minRating,
    p_on_sale: p.onSale ?? false,
  };
}

export const listProducts = unstable_cache(
  async (p: ListParams) =>
    PREVIEW_MODE
      ? preview.previewList(p)
      : rpcOrThrow<CatalogListResult>(
      supabasePublic().rpc("catalog_list", { ...listArgs(p), p_sort: p.sort ?? "recommended", p_page: p.page ?? 1, p_per_page: p.perPage ?? 24 }),
    ),
  ["catalog-list"],
  { tags: [TAGS.catalog], revalidate: 120 },
);

export const getFacets = unstable_cache(
  async (p: ListParams) =>
    PREVIEW_MODE
      ? preview.previewFacets(p)
      : rpcOrThrow<Facets>(supabasePublic().rpc("catalog_facets", listArgs(p))),
  ["catalog-facets"],
  { tags: [TAGS.catalog], revalidate: 300 },
);

export async function searchSuggest(query: string, market: MarketCode): Promise<SearchSuggestions> {
  if (PREVIEW_MODE) return preview.previewSearch(query, market);
  return rpcOrThrow<SearchSuggestions>(supabasePublic().rpc("search_suggest", { p_query: query, p_market: market, p_limit: 6 }));
}

export async function productCards(ids: string[], market: MarketCode): Promise<ProductCardData[]> {
  if (!ids.length) return [];
  if (PREVIEW_MODE) return preview.previewCards(ids, market);
  return rpcOrThrow<ProductCardData[]>(supabasePublic().rpc("product_cards", { p_ids: ids.slice(0, 48), p_market: market }));
}

export async function compareProducts(ids: string[], market: MarketCode) {
  if (PREVIEW_MODE) return { products: preview.previewCards(ids, market), attributes: [] };
  return rpcOrThrow<{ products: ProductCardData[]; attributes: Array<{ code: string; name: string; unit: string | null; values: Record<string, string> }> }>(
    supabasePublic().rpc("catalog_compare", { p_ids: ids.slice(0, 4), p_market: market }),
  );
}

export const getBrand = unstable_cache(
  async (slug: string) => {
    if (PREVIEW_MODE) return preview.previewBrand(slug);
    const { data, error } = await supabasePublic()
      .from("brands")
      .select("id, slug, name, description, seo_title, seo_description, translations, updated_at")
      .eq("slug", slug)
      .eq("is_active", true)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data;
  },
  ["brand"],
  { tags: [TAGS.catalog], revalidate: 3600 },
);

export const getAllBrands = unstable_cache(
  async () => {
    if (PREVIEW_MODE) return [];
    const { data, error } = await supabasePublic().from("brands").select("slug, name, updated_at").eq("is_active", true).order("name");
    if (error) throw new Error(error.message);
    return data;
  },
  ["brands-all"],
  { tags: [TAGS.catalog], revalidate: 3600 },
);

export const getContentPage = unstable_cache(
  async (slug: string) => {
    if (PREVIEW_MODE) return preview.previewContentPage(slug);
    const { data, error } = await supabasePublic()
      .from("content_pages")
      .select("slug, title, body, seo_description, footer_group, translations, requires_legal_review, updated_at")
      .eq("slug", slug)
      .eq("is_active", true)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data;
  },
  ["content-page"],
  { tags: [TAGS.content], revalidate: 3600 },
);

export const getFooterPages = unstable_cache(
  async () => {
    if (PREVIEW_MODE) return preview.previewContentPages().filter((p) => p.footer_group);
    const { data, error } = await supabasePublic()
      .from("content_pages")
      .select("slug, title, footer_group, sort_order, translations")
      .eq("is_active", true)
      .not("footer_group", "is", null)
      .order("sort_order");
    if (error) throw new Error(error.message);
    return data;
  },
  ["footer-pages"],
  { tags: [TAGS.content], revalidate: 3600 },
);

export interface PublicSettings {
  contact: { email: string; phone: string; hours: string };
  company: { name: string; address: string; company_id: string; vat_id: string; register: string };
  bank: { CZ?: { account: string | null; iban: string | null }; SK?: { iban: string | null } };
  termsVersion: string;
  showSecondaryCurrency: boolean;
  cutoffHour: number;
  social: Record<string, string | null>;
  freeShipping: Record<MarketCode, number | null>;
}

function buildSettings(values: Record<string, Json>, thresholds: Record<MarketCode, number | null>): PublicSettings {
  const get = <T,>(key: string, fallback: T): T => (key in values ? (values[key] as unknown as T) : fallback);
  return {
    contact: get("store.contact", { email: "", phone: "", hours: "" }),
    company: get("store.company", { name: "", address: "", company_id: "", vat_id: "", register: "" }),
    bank: get("bank.accounts", {}),
    termsVersion: get("checkout.terms_version", "unknown"),
    showSecondaryCurrency: get("catalog.show_secondary_currency", true),
    cutoffHour: Number(get("delivery.cutoff_hour", 14)),
    social: get("social.links", {}),
    freeShipping: { CZ: thresholds.CZ ?? null, SK: thresholds.SK ?? null },
  };
}

export const getPublicSettings = unstable_cache(
  async (): Promise<PublicSettings> => {
    if (PREVIEW_MODE) return buildSettings(preview.previewSettings(), preview.previewThresholds());
    const [{ data: settings, error }, { data: markets, error: mError }] = await Promise.all([
      supabasePublic().from("store_settings").select("key, value").eq("is_public", true),
      supabasePublic().from("markets").select("code, free_shipping_threshold"),
    ]);
    if (error) throw new Error(error.message);
    if (mError) throw new Error(mError.message);
    return buildSettings(
      Object.fromEntries((settings ?? []).map((row) => [row.key, row.value])),
      Object.fromEntries((markets ?? []).map((m) => [m.code, m.free_shipping_threshold])) as Record<MarketCode, number | null>,
    );
  },
  ["public-settings"],
  { tags: [TAGS.settings], revalidate: 3600 },
);

/** Vybere překlad pole z JSON sloupce translations (fallback na výchozí češtinu). */
export function translated(translations: Json | null | undefined, locale: string, field: string, fallback: string): string;
export function translated(translations: Json | null | undefined, locale: string, field: string, fallback: string | null): string | null;
export function translated(translations: Json | null | undefined, locale: string, field: string, fallback: string | null): string | null {
  if (translations && typeof translations === "object" && !Array.isArray(translations)) {
    const loc = (translations as Record<string, Json | undefined>)[locale];
    if (loc && typeof loc === "object" && !Array.isArray(loc)) {
      const value = (loc as Record<string, Json | undefined>)[field];
      if (typeof value === "string" && value) return value;
    }
  }
  return fallback;
}

export const getContentPageSlugs = unstable_cache(
  async (): Promise<string[]> => {
    if (PREVIEW_MODE) return preview.previewContentPages().map((p) => p.slug);
    const { data, error } = await supabasePublic().from("content_pages").select("slug").eq("is_active", true);
    if (error) throw new Error(error.message);
    return (data ?? []).map((p) => p.slug);
  },
  ["content-page-slugs"],
  { tags: [TAGS.content], revalidate: 3600 },
);

export const getProductSlugs = unstable_cache(
  async (): Promise<string[]> => {
    if (PREVIEW_MODE) return preview.previewSlugs();
    const { data, error } = await supabasePublic().from("products").select("slug").eq("is_active", true).limit(5000);
    if (error) throw new Error(error.message);
    return (data ?? []).map((p) => p.slug);
  },
  ["product-slugs"],
  { tags: [TAGS.catalog], revalidate: 3600 },
);
