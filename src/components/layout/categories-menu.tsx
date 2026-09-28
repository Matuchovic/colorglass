"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { ChevronDownIcon, MenuIcon } from "@/components/icons";
import { ArrowLongRight, PlayIcon } from "@/components/color/icons";
import { cn } from "@/lib/utils";

export type MenuCategory = { name: string; href: string; text: string | null; image: string | null };
export type MenuPromo = { title: string; text: string; cta: string; href: string };

/** „Všechny kategorie“ – skleněné mega menu (otevře se najetím i kliknutím). */
export function CategoriesMenu({ label, allLabel, allHref, categories, promo }: {
  label: string; allLabel: string; allHref: string; categories: MenuCategory[]; promo: MenuPromo;
}) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const timer = useRef<number | undefined>(undefined);
  const pathname = usePathname();
  const [path, setPath] = useState(pathname);
  if (path !== pathname) {
    setPath(pathname);
    setOpen(false);
  }
  const later = (value: boolean, ms: number) => {
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setOpen(value), ms);
  };
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => { if (!root.current?.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("pointerdown", onDown); document.removeEventListener("keydown", onKey); };
  }, [open]);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  return (
    <div ref={root} className="relative z-[3]" onMouseEnter={() => later(true, 90)} onMouseLeave={() => later(false, 180)}>
      <button type="button" onClick={() => { window.clearTimeout(timer.current); setOpen((o) => !o); }} aria-expanded={open} aria-haspopup="true"
        className={cn("mdev-pol gap-2.5 font-semibold text-ink-900", open && "bg-white shadow-[0_6px_16px_-8px_rgb(12_40_120/0.35)]")}>
        <MenuIcon size={20} />
        {label}
        <ChevronDownIcon size={15} className={cn("text-ink-500 transition-transform duration-300", open && "rotate-180")} />
      </button>
      <div data-open={open} inert={!open} className="mega-panel absolute left-0 top-[calc(100%+16px)] w-[800px] rounded-[28px] p-4">
        <div className="grid grid-cols-[1fr_230px] gap-4">
          <div>
            <div className="mb-2 flex items-center justify-between px-2">
              <span className="text-[11.5px] font-bold uppercase tracking-[0.14em] text-ink-400">{label}</span>
              <Link href={allHref} onClick={() => setOpen(false)} className="text-[13px] font-semibold text-brand-700 hover:underline">{allLabel} →</Link>
            </div>
            <ul className="grid grid-cols-2 gap-1.5">
              {categories.map((c, i) => (
                <li key={c.href} className="mega-item" style={{ "--i": i } as CSSProperties}>
                  <Link href={c.href} onClick={() => setOpen(false)} className="group flex items-center gap-3 rounded-2xl p-2 transition duration-300 hover:bg-white hover:shadow-[0_12px_30px_-18px_rgb(12_40_120/0.55)]">
                    <span className="relative h-12 w-16 shrink-0 overflow-hidden rounded-xl bg-tile">
                      {c.image && <Image src={c.image} alt="" fill sizes="64px" className="object-contain p-0.5 transition duration-500 group-hover:-rotate-6 group-hover:scale-110" />}
                    </span>
                    <span className="min-w-0">
                      <span className="block font-display text-[14.5px] font-bold text-ink-900 group-hover:text-brand-700">{c.name}</span>
                      {c.text && <span className="line-clamp-1 text-[12.5px] text-ink-500">{c.text}</span>}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <Link href={promo.href} onClick={() => setOpen(false)} style={{ "--i": categories.length } as CSSProperties}
            className="mega-item group relative flex flex-col justify-end overflow-hidden rounded-[22px] bg-navy-deep p-5 text-white">
            <span aria-hidden="true" className="ring-rainbow spin-slow absolute -right-12 -top-12 size-44 rounded-full opacity-90 [mask:radial-gradient(circle_closest-side,transparent_58%,#000_60%)]" />
            <span className="relative grid size-11 place-items-center rounded-full bg-white/12 ring-1 ring-white/20 transition group-hover:scale-110"><PlayIcon size={16} className="translate-x-[1px]" /></span>
            <span className="relative mt-3 font-display text-[21px] font-extrabold">{promo.title}</span>
            <span className="relative mt-1 text-[13px] leading-snug text-white/75">{promo.text}</span>
            <span className="relative mt-4 inline-flex items-center gap-2 text-[13.5px] font-semibold">{promo.cta}<ArrowLongRight size={16} className="transition-transform group-hover:translate-x-1" /></span>
          </Link>
        </div>
      </div>
    </div>
  );
}
