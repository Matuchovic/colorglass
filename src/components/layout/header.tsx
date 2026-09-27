import Link from "next/link";
import { Logo } from "@/components/ui/logo";
import { PlayIcon } from "@/components/color/icons";
import { HeaderActions } from "./header-actions";
import { MobileMenu } from "./mobile-menu";
import { SearchBox } from "./search-box";
import { CategoriesMenu } from "./categories-menu";
import { storePath, type StoreCode } from "@/lib/store";
import type { Dictionary } from "@/i18n";
import type { CategoryNode } from "@/types/catalog";

/** Hlavička COLOR: bílý řádek s logem, vyhledáváním, akcemi a ColorTest + bílý panel navigace (překrývá hero). */
export function Header({ store, t, categories }: { store: StoreCode; t: Dictionary; categories: CategoryNode[] }) {
  const c = t.color;
  const p = (path: string) => storePath(store, path);
  const links = [
    { href: p("/kategorie/bryle"), label: c.nav.glasses },
    { href: p("/jak-to-funguje"), label: c.nav.howItWorks },
    { href: p("/colortest"), label: c.nav.colorTest, badge: c.nav.newBadge },
    { href: p("/recenze"), label: c.nav.reviews },
    { href: p("/pribehy"), label: c.nav.stories },
    { href: p("/faq"), label: c.nav.faq },
    { href: p("/blog"), label: c.nav.blog },
  ];
  const tree = categories.filter((x) => x.show_in_menu);
  const menuCategories = tree.map((x) => ({ name: x.name, path: x.path, children: x.children.filter((ch) => ch.show_in_menu).map((ch) => ({ name: ch.name, path: ch.path })) }));
  const accountLabels = {
    account: t.header.account, close: t.common.close, loginTitle: t.auth.loginTitle, email: t.auth.email, password: t.auth.password,
    login: t.auth.login, forgot: t.auth.forgot, noAccount: t.auth.noAccount, registerCta: t.auth.registerCta,
    panelRegisterText: t.auth.panelRegisterText, loginSuccess: t.auth.loginSuccess, previewNote: t.auth.previewNote, hello: t.auth.hello,
    google: t.auth.google, invalidCredentials: t.auth.invalidCredentials, emailNotConfirmed: t.auth.emailNotConfirmed,
    rateLimited: t.errors.rateLimited, validation: t.errors.validation, generic: t.errors.generic,
    nav: { overview: t.account.title, orders: t.account.nav.orders, addresses: t.account.nav.addresses, wishlist: t.account.nav.wishlist, logout: t.account.nav.logout },
  };
  return (
    <header className="sticky top-0 z-40 bg-white shadow-[0_1px_0_rgb(0_0_0/0.05)] lg:relative lg:top-auto lg:bg-transparent lg:shadow-none">
      <div aria-hidden="true" className="absolute inset-x-0 top-0 hidden h-[82px] bg-white lg:block" />
      <div className="relative mx-auto max-w-[1316px] bg-white px-4 lg:rounded-b-[20px] lg:px-7 lg:shadow-[0_22px_40px_-30px_rgb(10_18_38/0.55)]">
        <div className="flex h-16 items-center gap-3 lg:h-[82px] lg:gap-0">
          <MobileMenu categories={menuCategories} links={links.map(({ href, label }) => ({ href, label }))}
            labels={{ open: t.header.openMenu, close: t.header.closeMenu, categories: t.header.categories, login: t.auth.login, register: t.auth.registerCta, account: t.account.title }} />
          <Logo href={p("/")} label={t.header.home} tagline={c.tagline} className="text-[30px] lg:text-[50px]" />
          <span aria-hidden="true" className="mx-7 hidden h-10 w-px bg-ink-200 lg:block" />
          <SearchBox placeholder={t.header.searchPlaceholder} label={t.header.searchLabel} className="hidden max-w-[572px] flex-1 lg:block" />
          <div className="ml-auto flex items-center gap-1 lg:gap-8">
            <HeaderActions labels={{ wishlist: t.header.wishlist, cart: t.header.cart, cartCount: t.header.cartCount, wishlistCount: t.header.wishlistCount }}
              accountLabels={accountLabels} google={process.env.NEXT_PUBLIC_AUTH_GOOGLE === "true"} />
            <Link href={p("/colortest")} className="glow-frame hidden h-[56px] items-center gap-3 rounded-[14px] bg-navy-deep pl-2.5 pr-5 lg:flex">
              <span className="ring-rainbow grid size-[35px] place-items-center rounded-full p-[2.5px]">
                <span className="grid size-full place-items-center rounded-full bg-gradient-to-br from-[#2e86ff] via-[#2456f5] to-[#5b35e8] text-white">
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
        <nav aria-label={t.header.categories} className="hidden h-[52px] items-center gap-[34px] lg:flex">
          <CategoriesMenu label={c.nav.allCategories} categories={tree.map((x) => ({
            name: x.name, href: p(`/kategorie/${x.path}`), image: x.image_url,
            children: x.children.map((ch) => ({ name: ch.name, href: p(`/kategorie/${ch.path}`), image: ch.image_url, text: ch.description })),
          }))} />
          <span aria-hidden="true" className="-mx-2 h-5 w-px bg-ink-200" />
          {links.map((l) => (
            <Link key={l.href} href={l.href} className="flex items-center gap-2 text-[15px] font-medium text-ink-800 transition-colors hover:text-brand-700">
              {l.label}
              {l.badge && <span className="rounded-full bg-brand-600 px-2 py-[3px] text-[11px] font-bold leading-none text-white">{l.badge}</span>}
            </Link>
          ))}
        </nav>
      </div>
      <div className="px-4 pb-3 lg:hidden">
        <SearchBox placeholder={t.header.searchPlaceholder} label={t.header.searchLabel} />
      </div>
    </header>
  );
}
