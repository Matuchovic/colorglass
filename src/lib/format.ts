import type { CurrencyCode } from "./store";

const moneyCache = new Map<string, Intl.NumberFormat>();

/** Částka v haléřích/centech → „4 990 Kč“ / „27,90 €“ (Intl, správné nezlomitelné mezery). */
export function formatMoney(amountMinor: number, currency: CurrencyCode, intl: string): string {
  const fraction = amountMinor % 100 === 0 ? 0 : 2;
  const key = `${intl}|${currency}|${fraction}`;
  let f = moneyCache.get(key);
  if (!f) {
    f = new Intl.NumberFormat(intl, {
      style: "currency",
      currency,
      minimumFractionDigits: fraction,
      maximumFractionDigits: fraction,
    });
    moneyCache.set(key, f);
  }
  return f.format(amountMinor / 100);
}

export function formatNumber(value: number, intl: string, maximumFractionDigits = 1): string {
  return new Intl.NumberFormat(intl, { maximumFractionDigits }).format(value);
}

/** „26. 9. 2026“ */
export function formatDate(value: string | Date, intl: string, withTime = false): string {
  const date = typeof value === "string" ? new Date(value) : value;
  return new Intl.DateTimeFormat(intl, {
    day: "numeric",
    month: "numeric",
    year: "numeric",
    ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}),
    timeZone: "Europe/Prague",
  }).format(date);
}

/** „čtvrtek 1. 10.“ */
export function formatDayLong(value: Date, intl: string): string {
  return new Intl.DateTimeFormat(intl, { weekday: "long", day: "numeric", month: "numeric", timeZone: "Europe/Prague" }).format(value);
}

/** Normalizuje a naformátuje telefon: „+420 604 111 222“. Neznámý formát vrátí beze změny. */
export function formatPhone(input: string): string {
  const digits = input.replace(/[^\d+]/g, "");
  const m = digits.match(/^(?:\+|00)?(420|421)?(\d{9})$/);
  if (!m) return input.trim();
  const prefix = m[1] ?? "420";
  const n = m[2]!;
  return `+${prefix} ${n.slice(0, 3)} ${n.slice(3, 6)} ${n.slice(6)}`;
}

export function discountPercent(price: number, compareAt: number | null | undefined): number | null {
  if (!compareAt || compareAt <= price) return null;
  return Math.round(((compareAt - price) / compareAt) * 100);
}

export function formatRating(value: number, intl: string): string {
  return new Intl.NumberFormat(intl, { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(value);
}
