"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { CartIcon } from "@/components/icons";
import { BookIcon, BulbIcon, EyeIcon, FilmIcon, GlassesIcon, HelpIcon, StarLineIcon } from "@/components/color/icons";
import { useShop } from "@/components/providers/shop-provider";
import type { SearchLabels } from "@/components/search/search-panel";
import { SearchLauncher } from "@/components/search/smart-search";
import type { StoreCode } from "@/lib/store";
import { CategoriesMenu, type MenuCategory, type MenuPromo } from "./categories-menu";

export const NAV_ICONS = { glasses: GlassesIcon, bulb: BulbIcon, eye: EyeIcon, star: StarLineIcon, film: FilmIcon, help: HelpIcon, book: BookIcon } as const;
export type NavLink = { href: string; label: string; icon: keyof typeof NAV_ICONS; badge?: string };

const clean = (p: string) => p.replace(/^\/sk(?=\/|$)/, "") || "/";
export function isActivePath(pathname: string, href: string) {
  const a = clean(pathname);
  const b = clean(href);
  return b !== "/" && (a === b || a.startsWith(`${b}/`));
}

/**
 * Menu ve stylu MatuchaDev: skleněná pilulka, po hraně obíhá světlo, pod aktivní položkou (i pod kurzorem)
 * klouže podklad s pružinou. Při scrollu se přichytí nahoru a ukáže logo, hledání, košík a průběh stránky.
 */
export function DesktopNav({ store, links, categories, allHref, promo, labels, searchLabels, lang, homeHref, cartHref }: {
  store: StoreCode; links: NavLink[]; categories: MenuCategory[]; allHref: string; promo: MenuPromo;
  labels: { nav: string; allCategories: string; allGlasses: string; home: string; cart: string };
  searchLabels: SearchLabels; lang: string; homeHref: string; cartHref: string;
}) {
  const pathname = usePathname();
  const active = links.findIndex((l) => isActivePath(pathname, l.href));
  const [hover, setHover] = useState<number | null>(null);
  const [docked, setDocked] = useState(false);
  const { cartCount } = useShop();
  const sentinel = useRef<HTMLDivElement>(null);
  const pill = useRef<HTMLElement>(null);
  const list = useRef<HTMLDivElement>(null);
  const slider = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const box = list.current;
    const el = slider.current;
    if (!box || !el) return;
    const place = () => {
      const i = hover ?? active;
      const item = i >= 0 ? box.querySelectorAll<HTMLElement>("[data-nav-item]")[i] : undefined;
      if (!item) { el.style.opacity = "0"; return; }
      el.style.opacity = "1";
      el.style.left = `${item.offsetLeft}px`;
      el.style.width = `${item.offsetWidth}px`;
    };
    place();
    const ro = new ResizeObserver(place);
    ro.observe(box);
    return () => ro.disconnect();
  }, [hover, active]);

  useEffect(() => {
    const s = sentinel.current;
    if (!s) return;
    const io = new IntersectionObserver(([e]) => setDocked(!e!.isIntersecting), { rootMargin: "-14px 0px 0px 0px" });
    io.observe(s);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    const el = pill.current;
    if (!el) return;
    let raf = 0;
    const update = () => {
      raf = 0;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      el.style.setProperty("--progress", String(max > 0 ? Math.min(1, window.scrollY / max) : 0));
    };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(update); };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => { window.removeEventListener("scroll", onScroll); cancelAnimationFrame(raf); };
  }, []);

  return (
    <>
      <div ref={sentinel} aria-hidden="true" className="pointer-events-none hidden h-px lg:block" />
      <div className="sticky top-3 z-50 -mt-px hidden h-[54px] lg:block">
        <nav ref={pill} aria-label={labels.nav} data-docked={docked} style={{ viewTransitionName: "site-nav" }} className="mdev-pill mx-auto flex h-[54px] max-w-[1316px] items-center rounded-full pl-2 pr-2">
          <span aria-hidden="true" className="mdev-obrys" />
          <Link href={homeHref} aria-label={labels.home} className="mdev-mini" data-show={docked} tabIndex={docked ? 0 : -1}>
            <span className="ring-rainbow spin-slow block size-[30px] rounded-full [mask:radial-gradient(circle_closest-side,transparent_48%,#000_51%)]" />
          </Link>
          <CategoriesMenu label={labels.allCategories} allLabel={labels.allGlasses} allHref={allHref} categories={categories} promo={promo} />
          <span aria-hidden="true" className="relative z-[2] mx-2 h-6 w-px bg-[#dfe6f4]" />
          <div ref={list} className="relative z-[2] flex items-center gap-px" onMouseLeave={() => setHover(null)}>
            <span ref={slider} aria-hidden="true" className="mdev-jezdec" />
            {links.map((l, i) => {
              const Icon = NAV_ICONS[l.icon];
              return (
                <Link key={l.href} href={l.href} data-nav-item="" aria-current={i === active ? "page" : undefined} className="mdev-pol"
                  onMouseEnter={() => setHover(i)} onFocus={() => setHover(i)} onBlur={() => setHover(null)}>
                  <Icon size={15} className="mdev-ico" />
                  {l.label}
                  {l.badge && <span className="badge-shine rounded-full bg-brand-600 px-2 py-[3px] text-[10.5px] font-bold leading-none text-white">{l.badge}</span>}
                </Link>
              );
            })}
          </div>
          <div className="mdev-extra relative z-[2] ml-auto flex items-center gap-1" data-show={docked} inert={!docked}>
            <SearchLauncher store={store} labels={searchLabels} lang={lang} iconSize={20}
              className="grid size-10 place-items-center rounded-full text-ink-700 transition hover:bg-white hover:text-brand-700 hover:shadow-sm" />
            <Link href={cartHref} aria-label={labels.cart} className="grid size-10 place-items-center rounded-full text-ink-700 transition hover:bg-white hover:text-brand-700 hover:shadow-sm">
              <span data-cart-target="" className="relative">
                <CartIcon size={21} />
                {cartCount > 0 && <span key={cartCount} className="absolute -right-2 -top-1.5 grid h-[17px] min-w-[17px] animate-pop place-items-center rounded-full bg-brand-600 px-1 text-[10px] font-bold leading-none text-white">{cartCount}</span>}
              </span>
            </Link>
          </div>
          <span aria-hidden="true" className="mdev-progress" />
        </nav>
      </div>
    </>
  );
}
