"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type CSSProperties } from "react";
import { CartIcon, ChevronRightIcon, HeartIcon, UserIcon } from "@/components/icons";
import { ArrowLongRight } from "@/components/color/icons";
import { useShop } from "@/components/providers/shop-provider";
import type { SearchLabels } from "@/components/search/search-panel";
import { SearchLauncher } from "@/components/search/smart-search";
import { Logo } from "@/components/ui/logo";
import { storePath, type StoreCode } from "@/lib/store";
import { cn } from "@/lib/utils";
import type { MenuCategory } from "./categories-menu";
import { NAV_ICONS, isActivePath, type NavLink } from "./desktop-nav";

/** Mobilní hlavička ve stylu MatuchaDev: skleněná pilulka + skleněné menu s postupně naskakujícími položkami. */
export function MobileHeader({ store, links, categories, allHref, labels, searchLabels, lang }: {
  store: StoreCode; links: NavLink[]; categories: MenuCategory[]; allHref: string; searchLabels: SearchLabels; lang: string;
  labels: {
    home: string; tagline: string; cart: string; open: string; close: string; nav: string; categories: string; allGlasses: string;
    account: string; login: string; register: string; wishlist: string; cta: string; ctaText: string; otherStore: string;
  };
}) {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const pathname = usePathname();
  const [path, setPath] = useState(pathname);
  if (path !== pathname) {
    setPath(pathname);
    setOpen(false);
  }
  const { cartCount, wishlist, user } = useShop();
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  useEffect(() => {
    if (!open) return;
    const html = document.documentElement;
    const prev = html.style.overflow;
    html.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => { html.style.overflow = prev; window.removeEventListener("keydown", onKey); };
  }, [open]);
  const p = (href: string) => storePath(store, href);
  const bare = pathname.replace(/^\/sk(?=\/|$)/, "") || "/";
  const otherHref = store === "sk" ? bare : `/sk${bare === "/" ? "" : bare}`;
  let n = 0;
  const item = () => ({ "--i": n++ } as CSSProperties);
  const iconBtn = "grid size-11 place-items-center rounded-full text-ink-800 transition active:scale-90 active:bg-white";
  return (
    <div className="sticky top-0 z-50 px-2.5 pb-2 pt-2 lg:hidden">
      <div className="relative">
        <div data-docked={scrolled || open} style={{ viewTransitionName: "site-mobile" }} className="mdev-pill flex h-[62px] items-center gap-0.5 rounded-full pl-1.5 pr-1.5">
          <span aria-hidden="true" className="mdev-obrys" />
          <button type="button" className="mdev-burger" data-open={open} onClick={() => setOpen((o) => !o)}
            aria-expanded={open} aria-controls="mobilni-menu" aria-label={open ? labels.close : labels.open}>
            <span /><span /><span />
          </button>
          <Logo href={p("/")} label={labels.home} tagline={labels.tagline} className="relative z-[2] ml-0.5 text-[25px]" />
          <div className="relative z-[2] ml-auto flex items-center">
            <SearchLauncher store={store} labels={searchLabels} lang={lang} className={iconBtn} iconSize={22} />
            <Link href={p("/kosik")} aria-label={labels.cart} className={iconBtn}>
              <span data-cart-target="" className="relative">
                <CartIcon size={23} />
                {cartCount > 0 && <span key={cartCount} className="absolute -right-2 -top-1.5 grid h-[18px] min-w-[18px] animate-pop place-items-center rounded-full bg-brand-600 px-1 text-[10.5px] font-bold leading-none text-white">{cartCount}</span>}
              </span>
            </Link>
          </div>
        </div>

        <nav id="mobilni-menu" data-open={open} inert={!open} aria-label={labels.nav}
          className="mdev-sheet absolute inset-x-0 top-[calc(100%+10px)] max-h-[calc(100dvh-100px)] overflow-y-auto overscroll-contain rounded-[28px] p-2.5">
          <ul className="space-y-0.5">
            {links.map((l) => {
              const Icon = NAV_ICONS[l.icon];
              const act = isActivePath(pathname, l.href);
              return (
                <li key={l.href} className="mdev-item" style={item()}>
                  <Link href={l.href} aria-current={act ? "page" : undefined}
                    className={cn("flex h-[54px] items-center gap-3.5 rounded-2xl px-2.5 text-[16px] font-semibold transition active:scale-[0.98]", act ? "bg-brand-50 text-brand-700" : "text-ink-900 active:bg-[#f3f6fc]")}>
                    <span className={cn("grid size-10 place-items-center rounded-xl transition", act ? "bg-brand-600 text-white shadow-[0_8px_18px_-8px_rgb(12_96_254/0.9)]" : "bg-[#f1f5fe] text-brand-600")}><Icon size={19} /></span>
                    {l.label}
                    {l.badge && <span className="badge-shine rounded-full bg-brand-600 px-2 py-0.5 text-[11px] font-bold text-white">{l.badge}</span>}
                    <ChevronRightIcon size={18} className="ml-auto text-ink-300" />
                  </Link>
                </li>
              );
            })}
          </ul>
          <div className="mdev-item mt-4 flex items-center justify-between px-2.5" style={item()}>
            <span className="text-[11.5px] font-bold uppercase tracking-[0.14em] text-ink-400">{labels.categories}</span>
            <Link href={allHref} className="text-[13px] font-semibold text-brand-700">{labels.allGlasses} →</Link>
          </div>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {categories.map((c) => (
              <Link key={c.href} href={c.href} style={item()} className="mdev-item flex items-center gap-2.5 rounded-2xl bg-tile p-2 transition active:scale-[0.97]">
                <span className="relative h-10 w-14 shrink-0">{c.image && <Image src={c.image} alt="" fill sizes="56px" className="object-contain" />}</span>
                <span className="font-display text-[14px] font-bold text-ink-900">{c.name}</span>
              </Link>
            ))}
          </div>
          <div className="mdev-item mt-3 grid grid-cols-2 gap-2" style={item()}>
            {user ? (
              <Link href={p("/muj-ucet")} className="flex h-12 items-center justify-center gap-2 rounded-2xl bg-[#f1f5fe] text-[14.5px] font-semibold text-ink-900 active:scale-[0.97]"><UserIcon size={18} />{labels.account}</Link>
            ) : (
              <Link href={p("/prihlaseni")} className="flex h-12 items-center justify-center gap-2 rounded-2xl bg-[#f1f5fe] text-[14.5px] font-semibold text-ink-900 active:scale-[0.97]"><UserIcon size={18} />{labels.login}</Link>
            )}
            <Link href={p("/oblibene")} className="flex h-12 items-center justify-center gap-2 rounded-2xl bg-[#f1f5fe] text-[14.5px] font-semibold text-ink-900 active:scale-[0.97]">
              <HeartIcon size={18} />{labels.wishlist}{wishlist.length > 0 && <span className="rounded-full bg-brand-600 px-1.5 text-[11px] font-bold text-white">{wishlist.length}</span>}
            </Link>
          </div>
          {!user && <Link href={p("/registrace")} style={item()} className="mdev-item mt-2 flex h-11 items-center justify-center rounded-2xl text-[14px] font-semibold text-brand-700 active:bg-brand-50">{labels.register}</Link>}
          <Link href={p("/colortest")} style={item()} className="mdev-item btn-hero mt-3 flex h-14 items-center justify-center gap-2.5 rounded-2xl text-[16px] font-semibold text-white">
            {labels.cta}<ArrowLongRight size={18} />
          </Link>
          <div className="mdev-item mt-3 flex items-center justify-between px-2.5 pb-1 text-[13px] text-ink-500" style={item()}>
            <span>{labels.ctaText}</span>
            <a href={otherHref} data-no-transition="" className="font-semibold text-brand-700">{labels.otherStore}</a>
          </div>
        </nav>
      </div>
      <div aria-hidden="true" data-open={open} className="mdev-backdrop fixed inset-0 -z-10 bg-ink-950/30 backdrop-blur-[3px]" onClick={() => setOpen(false)} />
    </div>
  );
}
