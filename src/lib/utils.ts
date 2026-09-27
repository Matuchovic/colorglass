/** Spojí CSS třídy, ignoruje prázdné hodnoty. */
export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(" ");
}

/**
 * Ochrana proti open redirectu: povolí jen relativní cestu na stejném webu.
 * Odmítne //evil.com, /\evil.com, javascript:, absolutní URL a řídicí znaky.
 */
export function safeRedirectPath(input: unknown, fallback = "/"): string {
  if (typeof input !== "string" || input.length === 0 || input.length > 512) return fallback;
  if (!input.startsWith("/") || input.startsWith("//") || input.startsWith("/\\")) return fallback;
  if (/[\u0000-\u001f\u007f]/.test(input) || input.includes("\\")) return fallback;
  try {
    const url = new URL(input, "https://color.invalid");
    if (url.origin !== "https://color.invalid") return fallback;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return fallback;
  }
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function toInt(value: unknown, fallback: number): number {
  const n = typeof value === "string" ? Number.parseInt(value, 10) : typeof value === "number" ? Math.trunc(value) : NaN;
  return Number.isFinite(n) ? n : fallback;
}

/** První hodnota z query parametru (string | string[] | undefined) */
export function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export function slugify(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
}
