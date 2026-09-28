import { getDictionary } from "@/i18n";
import { formatMoney } from "@/lib/format";
import { DEFAULT_SYNONYMS, type SearchDoc, type SearchIndex } from "@/lib/smart-search";
import { STORES, type StoreCode } from "@/lib/store";
import { getCategoryTree, getFooterPages, listProducts, translated } from "@/server/catalog";

// Další slova, pod kterými lidé hledají obsahové stránky (bez diakritiky)
const PAGE_KEYWORDS: Record<string, string> = {
  "jak-to-funguje": "jak funguji cocky filtr princip technologie ako funguju sosovky",
  faq: "caste otazky dotazy pomoc otazky",
  "doprava-a-platba": "doprava platba postovne dodani doruceni zasilkovna ppl dobirka prevod",
  "vraceni-zbozi": "vraceni vratit vratenie 30 dni vymena",
  "reklamacni-rad": "reklamace reklamacia zaruka zaruka",
  kontakt: "kontakt telefon email podpora poradna",
  recenze: "recenze recenzie hodnoceni hodnotenie zkusenosti",
  pribehy: "pribehy pribehy zakaznici video reakce",
  blog: "blog clanky rady",
  "o-nas": "o nas firma tym",
};

/** Index pro chytré vyhledávání: produkty (i s kategoriemi, do kterých patří), kategorie, stránky a ColorTest. */
export async function buildSearchIndex(code: StoreCode): Promise<SearchIndex> {
  const store = STORES[code];
  const t = getDictionary(store.locale);
  const [tree, pages, all] = await Promise.all([
    getCategoryTree(store.market),
    getFooterPages(),
    listProducts({ market: store.market, sort: "bestselling", page: 1, perPage: 100 }),
  ]);
  const flat = tree.flatMap((c) => [c, ...c.children]);
  const members = await Promise.all(
    flat.map((c) => listProducts({ market: store.market, categoryPath: c.path, sort: "bestselling", page: 1, perPage: 100 })
      .then((r) => ({ c, ids: new Set(r.items.map((p) => p.id)), first: r.items[0]?.image?.url ?? null }))),
  );
  const n = all.items.length;
  const products: SearchDoc[] = all.items.map((p, i) => {
    const cats = members.filter((m) => m.ids.has(p.id)).map((m) => m.c);
    return {
      id: p.id,
      kind: "product",
      title: p.name,
      subtitle: cats.filter((c) => c.path.includes("/")).map((c) => c.name).join(" · ") || null,
      href: `/produkt/${p.slug}`,
      image: p.image?.url ?? null,
      price: formatMoney(p.price, p.currency, store.intl),
      compareAt: p.compare_at ? formatMoney(p.compare_at, p.currency, store.intl) : null,
      rating: p.rating_avg,
      ratingCount: p.rating_count,
      badge: p.badge ? t.product.badges[p.badge] : null,
      keywords: cats.map((c) => `${c.name} ${c.path.replace(/[/-]/g, " ")} ${c.description ?? ""}`).join(" "),
      popularity: n - i,
    };
  });
  const categories: SearchDoc[] = members.map(({ c, ids, first }) => ({
    id: `cat:${c.path}`, kind: "category", title: c.name, subtitle: c.description ?? null, href: `/kategorie/${c.path}`,
    image: c.image_url ?? first, price: null, compareAt: null, rating: 0, ratingCount: 0, badge: null,
    keywords: c.path.replace(/[/-]/g, " "), popularity: ids.size,
  }));
  const pageDocs: SearchDoc[] = pages.map((pg) => ({
    id: `page:${pg.slug}`, kind: "page", title: translated(pg.translations, store.locale, "title", pg.title), subtitle: null, href: `/${pg.slug}`,
    image: null, price: null, compareAt: null, rating: 0, ratingCount: 0, badge: null,
    keywords: `${pg.slug.replace(/-/g, " ")} ${PAGE_KEYWORDS[pg.slug] ?? ""}`, popularity: PAGE_KEYWORDS[pg.slug] ? 2 : 0,
  }));
  pageDocs.unshift({
    id: "page:colortest", kind: "page", title: "ColorTest", subtitle: t.color.colortest.title, href: "/colortest", image: null, price: null, compareAt: null,
    rating: 0, ratingCount: 0, badge: null, keywords: "test barvocit barevne videni ishihara online vysetreni farbocit farebne videnie", popularity: 6,
  });
  return { docs: [...categories, ...products, ...pageDocs], synonyms: DEFAULT_SYNONYMS, popular: [...t.color.search.popularItems] };
}
