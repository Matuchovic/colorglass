"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { ArrowRightIcon, SearchIcon } from "@/components/icons";
import { useShop } from "@/components/providers/shop-provider";
import { formatMoney } from "@/lib/format";
import { STORES, storePath } from "@/lib/store";
import { cn } from "@/lib/utils";
import type { SearchSuggestions } from "@/types/catalog";

type Item = { key: string; href: string; label: string };

/** Vyhledávání s našeptávačem (WAI-ARIA combobox): šipky, Enter, Escape, klik mimo zavře. */
export function SearchBox({ placeholder, label, className }: { placeholder: string; label: string; className?: string }) {
  const { store, labels } = useShop();
  const router = useRouter();
  const listId = useId();
  const rootRef = useRef<HTMLFormElement>(null);
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<{ q: string; data: SearchSuggestions } | null>(null);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const trimmed = query.trim();

  useEffect(() => {
    if (trimmed.length < 2) return;
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      try {
        const res = await fetch(`/api/search/suggest?store=${store}&q=${encodeURIComponent(trimmed)}`, { signal: controller.signal });
        if (res.ok) setResult({ q: trimmed, data: (await res.json()) as SearchSuggestions });
      } catch {
        // zrušený nebo neúspěšný požadavek – našeptávač se nezobrazí
      }
    }, 180);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [trimmed, store]);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  const data = trimmed.length >= 2 && result ? result.data : null;
  const searchHref = storePath(store, `/hledat?q=${encodeURIComponent(trimmed)}`);
  const items: Item[] = data
    ? [
        ...data.products.map((p) => ({ key: `p-${p.id}`, href: storePath(store, `/produkt/${p.slug}`), label: p.name })),
        ...data.categories.map((c) => ({ key: `c-${c.path}`, href: storePath(store, `/kategorie/${c.path}`), label: c.name })),
        ...data.brands.map((b) => ({ key: `b-${b.slug}`, href: storePath(store, `/znacka/${b.slug}`), label: b.name })),
        { key: "all", href: searchHref, label: labels.search.showAll },
      ]
    : [];
  const showPanel = open && trimmed.length >= 2 && data !== null;
  const empty = data !== null && data.products.length + data.categories.length + data.brands.length === 0;

  const go = (href: string) => {
    setOpen(false);
    router.push(href);
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (active >= 0 && items[active]) return go(items[active].href);
    if (trimmed.length >= 2) go(searchHref);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown" && items.length) {
      e.preventDefault();
      setOpen(true);
      setActive((i) => (i + 1) % items.length);
    } else if (e.key === "ArrowUp" && items.length) {
      e.preventDefault();
      setActive((i) => (i <= 0 ? items.length - 1 : i - 1));
    } else if (e.key === "Escape") {
      setOpen(false);
      setActive(-1);
    }
  };

  const indexOf = (key: string) => items.findIndex((i) => i.key === key);
  const optionClass = (key: string) =>
    cn("flex w-full items-center gap-3 rounded-field px-3 py-2 text-left text-sm transition-colors", indexOf(key) === active ? "bg-brand-50" : "hover:bg-ink-50");
  const cfg = STORES[store];

  return (
    <form ref={rootRef} role="search" onSubmit={onSubmit} className={cn("relative", className)}>
      <label className="sr-only" htmlFor={`${listId}-input`}>{label}</label>
      <div className="flex h-12 items-center gap-3 rounded-full bg-ink-100/80 px-5 ring-1 ring-transparent transition focus-within:bg-white focus-within:ring-brand-600 md:h-[52px]">
        <SearchIcon size={21} className="shrink-0 text-ink-700" />
        <input
          id={`${listId}-input`}
          type="search"
          role="combobox"
          aria-expanded={showPanel}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={active >= 0 && items[active] ? `${listId}-${items[active].key}` : undefined}
          autoComplete="off"
          enterKeyHint="search"
          maxLength={80}
          value={query}
          placeholder={placeholder}
          onChange={(e) => {
            setQuery(e.target.value);
            setActive(-1);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          className="h-full w-full bg-transparent text-[15px] text-ink-900 placeholder:text-ink-500 focus:outline-none [&::-webkit-search-cancel-button]:hidden"
        />
      </div>
      {showPanel && (
        <div id={listId} role="listbox" aria-label={label}
          className="absolute inset-x-0 top-full z-50 mt-2 max-h-[70vh] animate-fade-in overflow-y-auto rounded-card bg-white p-2 shadow-lift ring-1 ring-ink-100">
          {empty && <p className="px-3 py-4 text-sm text-ink-600">{labels.search.noResults.replace("{query}", trimmed)}</p>}
          {data.products.length > 0 && (
            <div className="pb-1">
              <p className="px-3 pb-1 pt-2 text-xs font-semibold uppercase tracking-wider text-ink-500">{labels.search.products}</p>
              {data.products.map((p) => {
                const key = `p-${p.id}`;
                return (
                  <button type="button" key={key} id={`${listId}-${key}`} role="option" aria-selected={indexOf(key) === active}
                    onMouseEnter={() => setActive(indexOf(key))} onClick={() => go(storePath(store, `/produkt/${p.slug}`))} className={optionClass(key)}>
                    <span className="grid size-11 shrink-0 place-items-center rounded-lg bg-surface">
                      {p.image && <Image src={p.image.url} alt="" width={40} height={40} className="size-10 object-contain" />}
                    </span>
                    <span className="min-w-0 flex-1 truncate font-medium text-ink-900">{p.name}</span>
                    <span className="shrink-0 font-semibold text-ink-900 tabular-nums">{formatMoney(p.price, cfg.currency, cfg.intl)}</span>
                  </button>
                );
              })}
            </div>
          )}
          {data.categories.length + data.brands.length > 0 && (
            <div className="border-t border-ink-100 pb-1 pt-1">
              <p className="px-3 pb-1 pt-2 text-xs font-semibold uppercase tracking-wider text-ink-500">
                {data.categories.length ? labels.search.categories : labels.search.brands}
              </p>
              {[...data.categories.map((c) => ({ key: `c-${c.path}`, name: c.name, href: storePath(store, `/kategorie/${c.path}`) })),
                ...data.brands.map((b) => ({ key: `b-${b.slug}`, name: b.name, href: storePath(store, `/znacka/${b.slug}`) }))].map((row) => (
                <button type="button" key={row.key} id={`${listId}-${row.key}`} role="option" aria-selected={indexOf(row.key) === active}
                  onMouseEnter={() => setActive(indexOf(row.key))} onClick={() => go(row.href)} className={optionClass(row.key)}>
                  <SearchIcon size={16} className="text-ink-400" />
                  <span className="font-medium text-ink-800">{row.name}</span>
                </button>
              ))}
            </div>
          )}
          {!empty && (
            <button type="button" id={`${listId}-all`} role="option" aria-selected={indexOf("all") === active}
              onMouseEnter={() => setActive(indexOf("all"))} onClick={() => go(searchHref)}
              className={cn(optionClass("all"), "mt-1 justify-center border-t border-ink-100 font-semibold text-brand-700")}>
              {labels.search.showAll}
              <ArrowRightIcon size={16} />
            </button>
          )}
        </div>
      )}
    </form>
  );
}
