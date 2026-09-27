import type { CurrencyCode, MarketCode } from "@/lib/store";

// Tvary JSON odpovědí databázových funkcí (supabase/migrations/*storefront*, *checkout*)
export type StockState = "in_stock" | "low_stock" | "backorder" | "out_of_stock";
export type ProductBadge = "bestseller" | "new" | "tip";

export interface ProductCardData {
  id: string;
  slug: string;
  name: string;
  brand: { name: string; slug: string } | null;
  image: { url: string; alt: string } | null;
  price: number;
  compare_at: number | null;
  currency: CurrencyCode;
  alt_price: number | null;
  alt_currency: CurrencyCode | null;
  rating_avg: number;
  rating_count: number;
  badge: ProductBadge | null;
  available: number;
  stock: StockState;
  variant_id: string;
  variant_count: number;
}

export interface CatalogListResult {
  total: number;
  page: number;
  per_page: number;
  items: ProductCardData[];
}

export interface FacetValue { slug: string; label: string; color: string | null; count: number }
export interface FacetAttribute {
  code: string;
  name: string;
  type: "select" | "multiselect" | "number" | "boolean" | "text";
  unit: string | null;
  values: FacetValue[];
  range: { min: number; max: number } | null;
}
export interface Facets {
  total: number;
  price: { min: number | null; max: number | null };
  in_stock_count: number;
  on_sale_count: number;
  brands: Array<{ slug: string; name: string; count: number }>;
  attributes: FacetAttribute[];
}

export interface CategoryNode {
  id: string;
  parent_id: string | null;
  slug: string;
  path: string;
  depth: number;
  name: string;
  description: string | null;
  image_url: string | null;
  banner_url: string | null;
  show_in_menu: boolean;
  seo_title: string | null;
  seo_description: string | null;
  updated_at: string;
  children: CategoryNode[];
}

export interface ProductVariant {
  id: string;
  sku: string;
  ean: string | null;
  name: string | null;
  options: Record<string, string>;
  image_id: string | null;
  is_default: boolean;
  price: number;
  compare_at: number | null;
  lowest_30d: number | null;
  alt_price: number | null;
  available: number;
  stock: StockState;
  restock_date: string | null;
}

export interface ReviewItem {
  id: string;
  author_name: string;
  author_city: string | null;
  rating: number;
  title: string | null;
  body: string;
  pros: string | null;
  cons: string | null;
  verified: boolean;
  admin_reply: string | null;
  published_at: string;
}

export interface ProductDetail {
  product: {
    id: string;
    slug: string;
    name: string;
    subtitle: string | null;
    short_description: string | null;
    description: string | null;
    package_contents: string | null;
    badge: ProductBadge | null;
    video_url: string | null;
    warranty_months: number | null;
    weight_grams: number | null;
    length_mm: number | null;
    width_mm: number | null;
    height_mm: number | null;
    seo_title: string | null;
    seo_description: string | null;
    rating_avg: number;
    rating_count: number;
    primary_category_id: string | null;
    updated_at: string;
  };
  currency: CurrencyCode;
  alt_currency: CurrencyCode | null;
  brand: { name: string; slug: string } | null;
  breadcrumbs: Array<{ name: string; path: string }>;
  images: Array<{ id: string; url: string; alt: string; width: number | null; height: number | null }>;
  variants: ProductVariant[];
  attributes: Array<{ code: string; name: string; unit: string | null; value: string; comparable: boolean }>;
  reviews: { avg: number; count: number; distribution: Record<string, number>; items: ReviewItem[] };
  relations: {
    related: ProductCardData[];
    alternative: ProductCardData[];
    accessory: ProductCardData[];
    bought_together: ProductCardData[];
  };
  delivery: { days_min: number | null; days_max: number | null; price_from: number | null; free_from: number | null } | null;
}

export interface Banner {
  id: string;
  eyebrow: string | null;
  title: string;
  title_highlight: string | null;
  subtitle: string | null;
  cta_label: string | null;
  cta_href: string | null;
  image_url: string;
  image_alt: string;
  image_position: "left" | "center" | "right";
  annotation: string | null;
  badge_text: string | null;
  layout: "photo" | "product";
}

export interface HomeReview {
  id: string;
  author_name: string;
  author_city: string | null;
  rating: number;
  body: string;
  verified: boolean;
  product_slug: string;
  product_name: string;
}

export type HomeSection =
  | { key: string; type: "hero" | "promo"; title: string | null; subtitle: string | null; config: { autoplay_ms?: number }; data: Banner[] }
  | { key: string; type: "categories"; title: string | null; subtitle: string | null; config: Record<string, unknown>; data: Array<{ id: string; name: string; path: string; image_url: string | null }> }
  | { key: string; type: "products"; title: string | null; subtitle: string | null; config: { link?: string; source?: string }; data: ProductCardData[] }
  | { key: string; type: "benefits"; title: string | null; subtitle: string | null; config: { items?: Array<{ icon: string; title: string; text: string }> }; data: null }
  | { key: string; type: "reviews"; title: string | null; subtitle: string | null; config: Record<string, unknown>; data: { avg: number; count: number; verified_count: number; items: HomeReview[] } }
  | { key: string; type: "newsletter"; title: string | null; subtitle: string | null; config: { eyebrow?: string }; data: null };

export interface SearchSuggestions {
  products: ProductCardData[];
  categories: Array<{ name: string; path: string }>;
  brands: Array<{ name: string; slug: string }>;
}

export interface QuoteLine {
  item_id: string;
  variant_id: string;
  product_id: string;
  slug: string;
  name: string;
  variant_name: string | null;
  sku: string;
  image: string | null;
  quantity: number;
  unit_price: number;
  compare_at: number | null;
  tax_rate_bps: number;
  line_subtotal: number;
  discount_amount: number;
  line_total: number;
  tax_amount: number;
  available: number;
  backorder: boolean;
  active: boolean;
  weight_grams: number;
  max_quantity: number;
}

export interface ShippingOption {
  id: string;
  code: string;
  carrier: string;
  type: "address" | "pickup_point" | "store_pickup";
  name: string;
  description: string | null;
  base_price: number;
  price: number;
  free_from: number | null;
  delivery_days_min: number;
  delivery_days_max: number;
  cod_allowed: boolean;
  available: boolean;
}

export interface PaymentOption {
  code: string;
  provider: "bank_transfer" | "cod" | "stripe" | "comgate" | "gopay";
  is_online: boolean;
  name: string;
  description: string | null;
  fee: number;
  available: boolean;
}

export type DiscountStatus =
  | "APPLIED" | "NOT_FOUND" | "INACTIVE" | "NOT_STARTED" | "EXPIRED" | "MARKET"
  | "USAGE_LIMIT" | "CUSTOMER_LIMIT" | "MIN_SUBTOTAL" | "NOT_ELIGIBLE";

export interface Quote {
  market: MarketCode;
  currency: CurrencyCode;
  locale: string;
  lines: QuoteLine[];
  item_count: number;
  subtotal: number;
  discount: { code: string; status: DiscountStatus; amount: number; free_shipping: boolean; name: string | null; min_subtotal: number | null } | null;
  discount_total: number;
  goods_total: number;
  free_shipping_threshold: number | null;
  free_shipping_remaining: number;
  shipping_methods: ShippingOption[];
  shipping: ShippingOption | null;
  payment_methods: PaymentOption[];
  payment: PaymentOption | null;
  shipping_total: number;
  payment_fee_total: number;
  grand_total: number;
  tax_total: number;
  vat_breakdown: Array<{ rate_bps: number; total: number; tax: number; base: number }>;
  weight_grams: number;
  issues: Array<{ code: "OUT_OF_STOCK" | "INSUFFICIENT_STOCK" | "UNAVAILABLE" | "SHIPPING_INVALID" | "PAYMENT_INVALID" | "CART_EMPTY"; item_id?: string; available?: number }>;
}

/** Klientský snímek košíku (hlavička, mini košík) */
export interface CartSnapshot {
  count: number;
  quote: Quote | null;
}
