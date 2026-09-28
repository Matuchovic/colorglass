// Chytré vyhledávání COLOR. Běží v prohlížeči (našeptávač, okamžitě) i na serveru (stránka /hledat) – výsledky jsou stejné.
// Umí: bez diakritiky, překlepy (Damerau-Levenshtein), začátky slov při psaní, významy („červená“ → Protan) a „Mysleli jste…?“.

export type SearchKind = "product" | "category" | "page";
export type SearchDoc = {
  id: string;
  kind: SearchKind;
  title: string;
  subtitle: string | null;
  href: string; // cesta bez prefixu obchodu (/produkt/…, /kategorie/…)
  image: string | null;
  price: string | null;
  compareAt: string | null;
  rating: number;
  ratingCount: number;
  badge: string | null;
  keywords: string;
  popularity: number;
};
export type SearchIndex = { docs: SearchDoc[]; synonyms: Record<string, string[]>; popular: string[] };
export type SearchHit = { doc: SearchDoc; score: number; marks: Array<[number, number]> };
export type SearchResult = { query: string; products: SearchHit[]; categories: SearchHit[]; pages: SearchHit[]; total: number; corrected: string | null };

// Kmeny slov → co znamenají (bez diakritiky). Kmen stačí: „cerven“ pokryje červená, červené, červenou…
export const DEFAULT_SYNONYMS: Record<string, string[]> = {
  cerven: ["protan"], protanop: ["protan"], protanom: ["protan"],
  zelen: ["deutan"], deuteranop: ["deutan"], deuteranom: ["deutan"], deuter: ["deutan"],
  modr: ["tritan"], zlut: ["tritan"], zlt: ["tritan"], tritanop: ["tritan"], tritanom: ["tritan"],
  barvoslep: ["bryle", "okuliare", "colortest"], farboslep: ["bryle", "okuliare", "colortest"], daltonis: ["bryle", "okuliare"],
  barvocit: ["colortest", "jak"], farbocit: ["colortest", "ako"], barvy: ["bryle", "okuliare"], farby: ["bryle", "okuliare"],
  bryl: ["bryle", "okuliare"], okuliar: ["okuliare", "bryle"], glasses: ["bryle", "okuliare"],
  slunec: ["outdoor"], slnec: ["outdoor"], venk: ["outdoor"], vonk: ["outdoor"], prirod: ["outdoor"], hory: ["outdoor"], turist: ["outdoor"], polariz: ["outdoor", "sport"],
  sport: ["sport", "outdoor"], kolo: ["sport"], bicyk: ["sport"], cyklo: ["sport"], beh: ["sport"],
  kancelar: ["indoor"], pocitac: ["indoor"], monitor: ["indoor"], skol: ["indoor"], interier: ["indoor"], uvnitr: ["indoor"], vnutri: ["indoor"],
  dioptri: ["clip"], nasazov: ["clip"], nasadz: ["clip"], klip: ["clip"], nastavec: ["clip"], nadstav: ["clip"],
  deti: ["detske"], detsk: ["detske"], dite: ["detske"], ditet: ["detske"], dieta: ["detske"], kid: ["detske", "kids"], junior: ["detske"],
  test: ["colortest"], vysetr: ["colortest"], ishihar: ["colortest"], zjist: ["colortest"], zist: ["colortest"],
  doprav: ["doprava"], postovn: ["doprava"], zasilk: ["doprava"], dorucen: ["doprava"], doruc: ["doprava"],
  vracen: ["vraceni"], vraten: ["vratenie", "vraceni"], reklamac: ["reklamacni", "reklamacny"], zaruk: ["reklamacni"],
  plat: ["platba"], kontakt: ["kontakt"], otazk: ["faq"], dotaz: ["faq"], pomoc: ["faq", "kontakt"], recenz: ["recenze", "recenzie"], pribeh: ["pribehy"], clank: ["blog"],
};

const COMBINING = /[\u0300-\u036f]/g;
export function normalize(s: string): string {
  return s.normalize("NFD").replace(COMBINING, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}
export function tokenize(s: string): string[] {
  const n = normalize(s);
  return n ? n.split(" ") : [];
}

/** Damerau-Levenshtein (OSA) s předčasným ukončením nad limitem. */
export function editDistance(a: string, b: string, max: number): number {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  const n = b.length;
  let prev2 = new Array<number>(n + 1).fill(0);
  let prev = Array.from({ length: n + 1 }, (_, j) => j);
  let cur = new Array<number>(n + 1).fill(0);
  for (let i = 1; i <= a.length; i++) {
    cur[0] = i;
    let rowMin = i;
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      let v = Math.min(prev[j]! + 1, cur[j - 1]! + 1, prev[j - 1]! + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) v = Math.min(v, prev2[j - 2]! + 1);
      cur[j] = v;
      if (v < rowMin) rowMin = v;
    }
    if (rowMin > max) return max + 1;
    [prev2, prev, cur] = [prev, cur, prev2];
  }
  return prev[n]!;
}

const typoBudget = (len: number) => (len >= 8 ? 2 : len >= 4 ? 1 : 0);

/** Kvalita shody slova dotazu se slovy dokumentu (0 = žádná, 1 = přesná). */
function matchToken(q: string, words: string[]): number {
  let best = 0;
  for (const w of words) {
    if (w === q) return 1;
    if (q.length >= 2 && w.startsWith(q)) best = Math.max(best, 0.8 + 0.15 * (q.length / w.length));
    else if (q.length >= 3 && w.includes(q)) best = Math.max(best, 0.5);
    else {
      const max = typoBudget(q.length);
      if (max === 0 || best >= 0.62) continue;
      const d = Math.min(editDistance(q, w, max), w.length > q.length + 1 ? editDistance(q, w.slice(0, q.length), max) : max + 1);
      if (d <= max) best = Math.max(best, d === 1 ? 0.62 : 0.45);
    }
  }
  return best;
}

function expand(synonyms: Record<string, string[]>, t: string): string[] {
  const out = new Set<string>();
  for (const [stem, meanings] of Object.entries(synonyms)) {
    const hit = stem === t || (t.length >= 3 && stem.startsWith(t)) || (stem.length >= 3 && t.startsWith(stem)) || (t.length >= 5 && editDistance(t, stem, 1) <= 1);
    if (hit) for (const m of meanings) if (m !== t) out.add(m);
  }
  return [...out];
}

type Prepared = { doc: SearchDoc; title: string[]; body: string[] };
const preparedCache = new WeakMap<SearchIndex, { docs: Prepared[]; vocab: string[] }>();
function prepare(index: SearchIndex) {
  let p = preparedCache.get(index);
  if (!p) {
    const docs = index.docs.map((doc) => ({ doc, title: tokenize(doc.title), body: tokenize(`${doc.subtitle ?? ""} ${doc.keywords}`) }));
    const vocab = new Set<string>();
    for (const d of docs) for (const w of [...d.title, ...d.body]) if (w.length >= 3) vocab.add(w);
    for (const k of Object.keys(index.synonyms)) if (k.length >= 4) vocab.add(k);
    p = { docs, vocab: [...vocab] };
    preparedCache.set(index, p);
  }
  return p;
}

/** Úseky názvu ke zvýraznění (indexy v původním textu, včetně diakritiky). */
function highlight(title: string, tokens: string[]): Array<[number, number]> {
  const marks: Array<[number, number]> = [];
  for (const m of title.matchAll(/[\p{L}\p{N}]+/gu)) {
    const word = normalize(m[0]);
    const start = m.index ?? 0;
    for (const t of tokens) {
      if (word.startsWith(t)) { marks.push([start, start + Math.min(t.length, m[0].length)]); break; }
      const max = typoBudget(t.length);
      if (max > 0 && Math.min(editDistance(t, word, max), editDistance(t, word.slice(0, t.length), max)) <= max) { marks.push([start, start + m[0].length]); break; }
    }
  }
  return marks;
}

function didYouMean(vocab: string[], tokens: string[]): string | null {
  let changed = false;
  const fixed = tokens.map((t) => {
    if (t.length < 3 || vocab.includes(t) || vocab.some((w) => w.startsWith(t))) return t;
    let best = t;
    let bestD = 3;
    for (const w of vocab) {
      const d = editDistance(t, w, 2);
      if (d < bestD) { best = w; bestD = d; }
    }
    if (bestD <= typoBudget(t.length) || (bestD === 2 && t.length >= 6)) { changed = true; return best; }
    return t;
  });
  return changed ? fixed.join(" ") : null;
}

export function search(index: SearchIndex, raw: string, limits = { products: 6, categories: 4, pages: 4 }): SearchResult {
  const tokens = tokenize(raw).slice(0, 8);
  const empty: SearchResult = { query: raw, products: [], categories: [], pages: [], total: 0, corrected: null };
  if (!tokens.length) return empty;
  const { docs, vocab } = prepare(index);
  const groups = tokens.map((t) => [{ t, w: 1 }, ...expand(index.synonyms, t).map((s) => ({ t: s, w: 0.82 }))]);
  const hits: SearchHit[] = [];
  for (const p of docs) {
    let score = 0;
    let matched = 0;
    for (const g of groups) {
      let best = 0;
      for (const { t, w } of g) best = Math.max(best, matchToken(t, p.title) * 10 * w, matchToken(t, p.body) * 5 * w);
      if (best > 0) matched += 1;
      score += best;
    }
    if (!matched) continue;
    if (matched < groups.length) score *= (matched / groups.length) * 0.55;
    score *= p.doc.kind === "category" ? 1.12 : p.doc.kind === "page" ? 0.85 : 1;
    score += Math.log1p(p.doc.popularity) * 0.25;
    hits.push({ doc: p.doc, score, marks: highlight(p.doc.title, tokens) });
  }
  hits.sort((a, b) => b.score - a.score);
  const top = hits.length ? hits[0]!.score : 0;
  const relevant = hits.filter((h) => h.score >= top * 0.18);
  const pick = (kind: SearchKind, n: number) => relevant.filter((h) => h.doc.kind === kind).slice(0, n);
  const products = pick("product", limits.products);
  const categories = pick("category", limits.categories);
  const pages = pick("page", limits.pages);
  const total = relevant.filter((h) => h.doc.kind === "product").length;
  const corrected = relevant.length === 0 ? didYouMean(vocab, tokens) : null;
  return { query: raw, products, categories, pages, total, corrected };
}
