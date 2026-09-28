import Link from "next/link";
import { Logo } from "@/components/ui/logo";
import { PlayIcon } from "@/components/color/icons";
import { CATEGORY_IMAGES } from "@/components/color/category-images";
import { SmartSearch } from "@/components/search/smart-search";
import { HeaderActions } from "./header-actions";
import { DesktopNav, type NavLink } from "./desktop-nav";
import { MobileHeader } from "./mobile-header";
import type { MenuCategory } from "./categories-menu";
import { storePath, type StoreCode } from "@/lib/store";
import type { Dictionary } from "@/i18n";
import type { CategoryNode } from "@/types/catalog";

/** Hlavička COLOR: řádek s logem, chytrým hledáním a akcemi + menu ve stylu MatuchaDev (desktop i mobil). */
export function Header({ store, t, categories }: { store: StoreCode; t: Dictionary; categories: CategoryNode[] }) {
  const c = t.color;
  const p = (path: string) => storePath(store, path);
  const links: NavLink[] = [
    { href: p("/kategorie/bryle"), label: c.nav.glasses, icon: "glasses" },
    { href: p("/jak-to-funguje"), label: c.nav.howItWorks, icon: "bulb" },
    { href: p("/colortest"), label: c.nav.colorTest, icon: "eye", badge: c.nav.newBadge },
    { href: p("/recenze"), label: c.nav.reviews, icon: "star" },
    { href: p("/pribehy"), label: c.nav.stories, icon: "film" },
    { href: p("/faq"), label: c.nav.faq, icon: "help" },
    { href: p("/blog"), label: c.nav.blog, icon: "book" },
  ];
  const tree = categories.filter((x) => x.show_in_menu);
  const menuCategories: MenuCategory[] = tree.flatMap((root) => root.children.filter((ch) => ch.show_in_menu).map((ch) => ({
    name: ch.name, href: p(`/kategorie/${ch.path}`), text: ch.description, image: ch.image_url ?? CATEGORY_IMAGES[ch.path.split("/").pop() ?? ""] ?? null,
  })));
  const allHref = p(`/kategorie/${tree[0]?.path ?? "bryle"}`);
  const lang = store === "sk" ? "sk-SK" : "cs-CZ";
  const promo = { title: c.colorTestCta.title, text: c.menu.ctaText, cta: c.menu.cta, href: p("/colortest") };
  const accountLabels = {
    account: t.header.account, close: t.common.close, loginTitle: t.auth.loginTitle, email: t.auth.email, password: t.auth.password,
    login: t.auth.login, forgot: t.auth.forgot, noAccount: t.auth.noAccount, registerCta: t.auth.registerCta,
    panelRegisterText: t.auth.panelRegisterText, loginSuccess: t.auth.loginSuccess, previewNote: t.auth.previewNote, hello: t.auth.hello,
    google: t.auth.google, invalidCredentials: t.auth.invalidCredentials, emailNotConfirmed: t.auth.emailNotConfirmed,
    rateLimited: t.errors.rateLimited, validation: t.errors.validation, generic: t.errors.generic,
    nav: { overview: t.account.title, orders: t.account.nav.orders, addresses: t.account.nav.addresses, wishlist: t.account.nav.wishlist, logout: t.account.nav.logout },
  };
  return (
    <>
      <header className="relative z-[55] hidden bg-white lg:block" style={{ viewTransitionName: "site-header" }}>
        <div className="mx-auto flex h-[82px] max-w-[1316px] items-center px-7">
          <Logo href={p("/")} label={t.header.home} tagline={c.tagline} className="text-[50px]" />
          <span aria-hidden="true" className="mx-7 h-10 w-px bg-ink-200" />
          <SmartSearch store={store} labels={c.search} lang={lang} className="max-w-[572px] flex-1" />
          <div className="ml-auto flex items-center gap-8">
            <HeaderActions labels={{ wishlist: t.header.wishlist, cart: t.header.cart, cartCount: t.header.cartCount, wishlistCount: t.header.wishlistCount }}
              accountLabels={accountLabels} google={process.env.NEXT_PUBLIC_AUTH_GOOGLE === "true"} />
            <Link href={p("/colortest")} className="glow-spin group flex h-[56px] items-center gap-3 rounded-[14px] pl-2.5 pr-5 transition-transform hover:-translate-y-0.5 [--glow-fill:#0e1630]">
              <span className="relative grid size-[35px] place-items-center">
                <span aria-hidden="true" className="ring-rainbow spin-slow absolute inset-0 rounded-full" />
                <span className="relative grid size-[30px] place-items-center rounded-full bg-gradient-to-br from-[#2e86ff] via-[#2456f5] to-[#5b35e8] text-white transition-transform group-hover:scale-110">
                  <PlayIcon size={15} className="translate-x-[1px]" />
                </span>
              </span>
              <span className="leading-tight">
                <span className="block font-display text-[15px] font-bold text-white">{c.colorTestCta.title}</span>
                <span className="block text-[12.5px] text-[#aeb8d6]">{c.colorTestCta.subtitle}</span>
              </span>
            </Link>
          </div>
        </div>
      </header>
      <DesktopNav store={store} links={links} categories={menuCategories} allHref={allHref} promo={promo} searchLabels={c.search} lang={lang}
        homeHref={p("/")} cartHref={p("/kosik")}
        labels={{ nav: c.menu.nav, allCategories: c.nav.allCategories, allGlasses: c.nav.allGlasses, home: t.header.home, cart: t.header.cart }} />
      <MobileHeader store={store} links={links} categories={menuCategories} allHref={allHref} searchLabels={c.search} lang={lang}
        labels={{
          home: t.header.home, tagline: c.tagline, cart: t.header.cart, open: c.menu.open, close: c.menu.close, nav: c.menu.nav,
          categories: c.menu.categories, allGlasses: c.nav.allGlasses, account: c.menu.account, login: c.menu.login, register: c.menu.register,
          wishlist: c.menu.wishlist, cta: c.menu.cta, ctaText: c.menu.ctaText, otherStore: c.topbar.switchTo,
        }} />
    </>
  );
}
