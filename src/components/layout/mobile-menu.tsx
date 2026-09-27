"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronRightIcon, CloseIcon, MenuIcon } from "@/components/icons";
import { useShop } from "@/components/providers/shop-provider";
import { storePath } from "@/lib/store";

type MenuCategory = { name: string; path: string; children: Array<{ name: string; path: string }> };

/** Mobilní menu (dialog): kategorie a hlavní odkazy, Escape zavře, focus se vrací na tlačítko. */
export function MobileMenu({ categories, links, labels }: {
  categories: MenuCategory[];
  links: Array<{ href: string; label: string }>;
  labels: { open: string; close: string; categories: string; login: string; register: string; account: string };
}) {
  const { store, user } = useShop();
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panelRef.current?.querySelector<HTMLElement>("a,button")?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    const trigger = buttonRef.current;
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
      trigger?.focus();
    };
  }, [open]);

  const close = () => setOpen(false);

  return (
    <>
      <button ref={buttonRef} type="button" onClick={() => setOpen(true)} aria-label={labels.open} aria-expanded={open}
        className="-ml-2 rounded-btn p-2 text-ink-800 hover:bg-ink-50 md:hidden">
        <MenuIcon size={26} />
      </button>
      {open && createPortal(
        <div className="fixed inset-0 z-[60] md:hidden" role="dialog" aria-modal="true" aria-label={labels.categories}>
          <button type="button" aria-label={labels.close} onClick={close} className="absolute inset-0 animate-fade-in bg-ink-950/40" tabIndex={-1} />
          <div ref={panelRef} className="absolute inset-y-0 left-0 flex w-[86%] max-w-sm flex-col bg-white shadow-drawer">
            <div className="flex items-center justify-between border-b border-ink-100 px-5 py-4">
              <p className="text-lg font-bold text-ink-900">{labels.categories}</p>
              <button type="button" onClick={close} aria-label={labels.close} className="-mr-2 rounded-btn p-2 hover:bg-ink-50">
                <CloseIcon size={22} />
              </button>
            </div>
            <nav className="flex-1 overflow-y-auto px-3 py-3">
              <ul className="space-y-1">
                {categories.map((c) => (
                  <li key={c.path}>
                    <Link href={storePath(store, `/kategorie/${c.path}`)} onClick={close}
                      className="flex items-center justify-between rounded-field px-3 py-3 font-semibold text-ink-900 hover:bg-surface">
                      {c.name}
                      <ChevronRightIcon size={18} className="text-ink-400" />
                    </Link>
                    {c.children.length > 0 && (
                      <ul className="mb-2 ml-3 border-l border-ink-100 pl-3">
                        {c.children.map((ch) => (
                          <li key={ch.path}>
                            <Link href={storePath(store, `/kategorie/${ch.path}`)} onClick={close}
                              className="block rounded-field px-3 py-2 text-sm text-ink-700 hover:bg-surface hover:text-ink-900">
                              {ch.name}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    )}
                  </li>
                ))}
              </ul>
              <ul className="mt-4 space-y-1 border-t border-ink-100 pt-4">
                {links.map((l) => (
                  <li key={l.href}>
                    <Link href={l.href} onClick={close} className="block rounded-field px-3 py-2.5 font-medium text-ink-800 hover:bg-surface">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
              <div className="mt-4 border-t border-ink-100 pt-4">
                {user ? (
                  <Link href={storePath(store, "/muj-ucet")} onClick={close} className="block rounded-field px-3 py-2.5 font-semibold text-brand-700 hover:bg-surface">
                    {labels.account}
                  </Link>
                ) : (
                  <div className="grid grid-cols-2 gap-2 px-1">
                    <Link href={storePath(store, "/prihlaseni")} onClick={close}
                      className="inline-flex h-11 items-center justify-center rounded-btn bg-brand-600 text-sm font-semibold text-white">{labels.login}</Link>
                    <Link href={storePath(store, "/registrace")} onClick={close}
                      className="inline-flex h-11 items-center justify-center rounded-btn bg-surface text-sm font-semibold text-ink-900">{labels.register}</Link>
                  </div>
                )}
              </div>
            </nav>
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}
