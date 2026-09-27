import type { MarketCode } from "./store";

// Odhad doručení: expedice v pracovní den do uzávěrky, víkendy a státní svátky ČR/SR se přeskakují.
function easterSunday(year: number): Date {
  const a = year % 19, b = Math.floor(year / 100), c = year % 100, d = Math.floor(b / 4), e = b % 4;
  const f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31), day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(Date.UTC(year, month - 1, day));
}

const iso = (d: Date) => d.toISOString().slice(0, 10);

export function publicHolidays(year: number, market: MarketCode): Set<string> {
  const fixed = market === "CZ"
    ? ["01-01", "05-01", "05-08", "07-05", "07-06", "09-28", "10-28", "11-17", "12-24", "12-25", "12-26"]
    : ["01-01", "01-06", "05-01", "05-08", "07-05", "08-29", "09-15", "11-01", "11-17", "12-24", "12-25", "12-26"];
  const days = new Set(fixed.map((md) => `${year}-${md}`));
  const easter = easterSunday(year);
  const add = (offset: number) => days.add(iso(new Date(easter.getTime() + offset * 86_400_000)));
  add(-2); // Velký pátek
  add(1); // Velikonoční pondělí
  return days;
}

function pragueParts(date: Date): { y: number; m: number; d: number; hour: number } {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Prague", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", hourCycle: "h23",
  }).formatToParts(date);
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value);
  return { y: get("year"), m: get("month"), d: get("day"), hour: get("hour") };
}

function isBusinessDay(date: Date, market: MarketCode): boolean {
  const dow = date.getUTCDay();
  if (dow === 0 || dow === 6) return false;
  return !publicHolidays(date.getUTCFullYear(), market).has(iso(date));
}

/** Vrátí datum (UTC půlnoc) předpokládaného doručení. */
export function estimateDelivery(now: Date, transitDays: number, market: MarketCode, cutoffHour = 14): Date {
  const p = pragueParts(now);
  let day = new Date(Date.UTC(p.y, p.m - 1, p.d));
  // expedice: dnes, pokud je pracovní den a před uzávěrkou; jinak nejbližší pracovní den
  if (!(isBusinessDay(day, market) && p.hour < cutoffHour)) {
    do day = new Date(day.getTime() + 86_400_000); while (!isBusinessDay(day, market));
  }
  let remaining = Math.max(transitDays, 0);
  while (remaining > 0) {
    day = new Date(day.getTime() + 86_400_000);
    if (isBusinessDay(day, market)) remaining--;
  }
  return day;
}
