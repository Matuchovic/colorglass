// Konfigurace obchodů (trh + jazyk + měna). Bezpečné pro server i klienta.
export type StoreCode = "cz" | "sk";
export type Locale = "cs" | "sk";
export type MarketCode = "CZ" | "SK";
export type CurrencyCode = "CZK" | "EUR";

export interface StoreConfig {
  code: StoreCode;
  market: MarketCode;
  locale: Locale;
  intl: "cs-CZ" | "sk-SK";
  currency: CurrencyCode;
  prefix: "" | "/sk";
}

export const STORES: Record<StoreCode, StoreConfig> = {
  cz: { code: "cz", market: "CZ", locale: "cs", intl: "cs-CZ", currency: "CZK", prefix: "" },
  sk: { code: "sk", market: "SK", locale: "sk", intl: "sk-SK", currency: "EUR", prefix: "/sk" },
};

export const DEFAULT_STORE: StoreCode = "cz";
export const SK_ENABLED = process.env.NEXT_PUBLIC_ENABLE_SK !== "false";
export const STORE_CODES: StoreCode[] = SK_ENABLED ? ["cz", "sk"] : ["cz"];

export function isStoreCode(value: unknown): value is StoreCode {
  return value === "cz" || (value === "sk" && SK_ENABLED);
}

export function getStore(code: string | undefined | null): StoreConfig {
  return isStoreCode(code) ? STORES[code] : STORES[DEFAULT_STORE];
}

export function storeByMarket(market: MarketCode): StoreConfig {
  return market === "SK" ? STORES.sk : STORES.cz;
}

/** Veřejná cesta v rámci obchodu: storePath("sk", "/kosik") → "/sk/kosik" */
export function storePath(store: StoreCode, path: string): string {
  const prefix = STORES[store].prefix;
  if (!path.startsWith("/")) path = `/${path}`;
  if (path === "/") return prefix || "/";
  return `${prefix}${path}`;
}

export function siteUrl(store: StoreCode = "cz"): string {
  // Na Vercelu bez vlastní domény použijeme produkční URL projektu (systémová proměnná Vercelu)
  const vercelHost = process.env.NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL || process.env.VERCEL_PROJECT_PRODUCTION_URL;
  const cz = (process.env.NEXT_PUBLIC_SITE_URL || (vercelHost ? `https://${vercelHost}` : "http://localhost:3000")).replace(/\/$/, "");
  const sk = process.env.NEXT_PUBLIC_SITE_URL_SK?.replace(/\/$/, "");
  return store === "sk" && sk ? sk : cz;
}

/** Absolutní URL (kanonické odkazy, sitemap, e-maily). Pokud má SK vlastní doménu, prefix /sk se nepoužije. */
export function absoluteUrl(store: StoreCode, path: string): string {
  const hasOwnDomain = store === "sk" && Boolean(process.env.NEXT_PUBLIC_SITE_URL_SK);
  const rel = hasOwnDomain ? (path.startsWith("/") ? path : `/${path}`) : storePath(store, path);
  return `${siteUrl(store)}${rel === "/" ? "" : rel}`;
}
