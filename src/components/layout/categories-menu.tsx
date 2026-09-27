"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ChevronDownIcon, MenuIcon } from "@/components/icons";
import { cn } from "@/lib/utils";

type Cat = { name: string; href: string; image: string | null; children: Array<{ name: string; href: string; image: string | null; text: string | null }> };

/** „Všechny kategorie“ – rozbalovací nabídka v navigaci. */
export function CategoriesMenu({ label, categories }: { label: string; categories: Cat[] }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onDown); document.removeEventListener("keydown", onKey); };
  }, [open]);
  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-haspopup="true"
        className="flex items-center gap-3 text-[15px] font-semibold text-ink-900 hover:text-brand-700">
        <MenuIcon size={22} />
        {label}
        <ChevronDownIcon size={16} className={cn("ml-3 text-ink-500 transition", open && "rotate-180")} />
      </button>
      {open && (
        <div className="absolute left-0 top-full z-50 mt-4 w-[640px] animate-fade-in rounded-card bg-white p-4 shadow-lift ring-1 ring-ink-100">
          {categories.map((c) => (
            <div key={c.href}>
              <Link href={c.href} onClick={() => setOpen(false)} className="mb-2 flex items-center justify-between rounded-field px-3 py-2 font-display text-[15px] font-bold text-ink-900 hover:bg-surface">
                {c.name}<span className="text-sm font-semibold text-brand-700">→</span>
              </Link>
              <ul className="grid grid-cols-2 gap-1">
                {c.children.map((ch) => (
                  <li key={ch.href}>
                    <Link href={ch.href} onClick={() => setOpen(false)} className="flex items-center gap-3 rounded-field px-3 py-2 hover:bg-surface">
                      <span className="relative h-9 w-14 shrink-0">{ch.image && <Image src={ch.image} alt="" fill sizes="56px" className="object-contain" />}</span>
                      <span><span className="block text-sm font-semibold text-ink-900">{ch.name}</span>{ch.text && <span className="line-clamp-1 text-xs text-ink-500">{ch.text}</span>}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
