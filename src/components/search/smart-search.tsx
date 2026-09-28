"use client";

import { usePathname, useRouter } from "next/navigation";
import { useDeferredValue, useEffect, useId, useMemo, useRef, useState, useSyncExternalStore, type KeyboardEvent } from "react";
import { createPortal } from "react-dom";
import { CloseIcon, SearchIcon } from "@/components/icons";
import { MicIcon } from "@/components/color/icons";
import { navigate } from "@/components/effects/view-transitions";
import { search } from "@/lib/smart-search";
import { storePath, type StoreCode } from "@/lib/store";
import { cn } from "@/lib/utils";
import { SearchPanel, buildSections, type Entry, type SearchLabels } from "./search-panel";
import { addRecentSearch, clearRecentSearches, useRecentSearches, useSearchIndex, useVoiceSearch } from "./search-state";

const noSubscribe = () => () => {};

function useSearchController(store: StoreCode, labels: SearchLabels) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(-1);
  const index = useSearchIndex(store, open);
  const recent = useRecentSearches();
  const deferred = useDeferredValue(query);
  const result = useMemo(() => (index && deferred.trim() ? search(index, deferred) : null), [index, deferred]);
  const sections = useMemo(() => buildSections(index, result, deferred, recent, labels), [index, result, deferred, recent, labels]);
  const count = useMemo(() => sections.reduce((n, s) => n + s.items.length, 0), [sections]);
  const [seen, setSeen] = useState(deferred);
  if (seen !== deferred) {
    setSeen(deferred);
    setActive(-1);
  }
  // Při přechodu na jinou stránku se hledání zavře
  const pathname = usePathname();
  const [path, setPath] = useState(pathname);
  if (path !== pathname) {
    setPath(pathname);
    setOpen(false);
  }
  const noResults = !!result && !result.products.length && !result.categories.length && !result.pages.length;
  return { open, setOpen, query, setQuery, active, setActive, sections, count, noResults, loading: open && !index, deferred };
}

function VoiceButton({ lang, label, onText }: { lang: string; label: string; onText: (t: string) => void }) {
  const v = useVoiceSearch(lang, (text) => onText(text));
  if (!v.supported) return null;
  return (
    <button type="button" onClick={v.listening ? v.stop : v.start} aria-label={label} aria-pressed={v.listening}
      className={cn("relative grid size-9 shrink-0 place-items-center rounded-full transition", v.listening ? "bg-brand-600 text-white" : "text-ink-500 hover:bg-white hover:text-brand-700")}>
      {v.listening && <><span aria-hidden="true" className="voice-ring" /><span aria-hidden="true" className="voice-ring [animation-delay:0.7s]" /></>}
      <MicIcon size={18} className="relative" />
    </button>
  );
}

type Props = { store: StoreCode; labels: SearchLabels; lang: string };

function handleKeys(e: KeyboardEvent<HTMLInputElement>, c: ReturnType<typeof useSearchController>, listId: string, close: () => void) {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      if (!c.count) return;
      e.preventDefault();
      const d = e.key === "ArrowDown" ? 1 : -1;
      const next = c.active < 0 ? (d > 0 ? 0 : c.count - 1) : (c.active + d + c.count) % c.count;
      c.setActive(next);
      document.getElementById(`${listId}-${next}`)?.scrollIntoView({ block: "nearest" });
    } else if (e.key === "Enter" && c.active >= 0 && !e.nativeEvent.isComposing) {
      e.preventDefault();
      document.getElementById(`${listId}-${c.active}`)?.click();
    } else if (e.key === "Escape") close();
}

/** Vyhledávací pole v hlavičce (desktop) s okamžitým našeptávačem. Zkratky: / a ⌘K / Ctrl+K. */
export function SmartSearch({ store, labels, lang, className }: Props & { className?: string }) {
  const c = useSearchController(store, labels);
  const router = useRouter();
  const listId = useId();
  const root = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const close = () => { c.setOpen(false); input.current?.blur(); };
  const submit = () => {
    const q = c.query.trim();
    if (!q) return;
    addRecentSearch(q);
    c.setOpen(false);
    navigate(router, storePath(store, `/hledat?q=${encodeURIComponent(q)}`));
  };
  const choose = (e: Entry) => {
    if (e.q !== undefined) { c.setQuery(e.q); input.current?.focus(); return; }
    if (c.query.trim()) addRecentSearch(c.query);
    c.setOpen(false);
  };
  const { open, setOpen } = c;
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => { if (!root.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [open, setOpen]);
  useEffect(() => {
    const onKey = (e: globalThis.KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      const typing = !!el && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName));
      if (!((e.key === "/" && !typing) || (e.key.toLowerCase() === "k" && (e.metaKey || e.ctrlKey)))) return;
      const field = input.current;
      if (!field || field.offsetParent === null) return;
      e.preventDefault();
      const r = field.getBoundingClientRect();
      if (r.bottom > 0 && r.top < window.innerHeight) { field.focus(); setOpen(true); }
      else window.dispatchEvent(new CustomEvent("color:open-search"));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [setOpen]);
  return (
    <div ref={root} className={cn("relative", className)}>
      <form role="search" action={storePath(store, "/hledat")} onSubmit={(e) => { e.preventDefault(); submit(); }}
        className={cn("search-field relative flex h-12 items-center gap-1.5 rounded-full bg-[#f1f4fd] pl-5 pr-1.5 ring-1 ring-transparent transition duration-300",
          c.open && "bg-white ring-brand-200 shadow-[0_0_0_5px_rgb(12_96_254/0.09),0_14px_34px_-20px_rgb(12_60_160/0.55)]")}>
        <SearchIcon size={20} className={cn("shrink-0 transition", c.open ? "text-brand-600" : "text-ink-500")} />
        <input ref={input} type="search" name="q" value={c.query} onChange={(e) => { c.setQuery(e.target.value); c.setOpen(true); }} onFocus={() => c.setOpen(true)}
          onKeyDown={(e) => handleKeys(e, c, listId, close)} role="combobox" aria-expanded={c.open} aria-controls={listId} aria-autocomplete="list"
          aria-activedescendant={c.active >= 0 ? `${listId}-${c.active}` : undefined} aria-label={labels.label} placeholder={labels.placeholder}
          autoComplete="off" autoCorrect="off" spellCheck={false} enterKeyHint="search"
          className="h-full min-w-0 flex-1 bg-transparent pl-1 text-[15px] text-ink-900 placeholder:text-ink-500 focus:outline-none [&::-webkit-search-cancel-button]:hidden" />
        {c.query && (
          <button type="button" onClick={() => { c.setQuery(""); input.current?.focus(); }} aria-label={labels.clear} className="grid size-8 shrink-0 place-items-center rounded-full text-ink-500 hover:bg-ink-100">
            <CloseIcon size={16} />
          </button>
        )}
        <VoiceButton lang={lang} label={labels.voice} onText={(t) => { c.setQuery(t); c.setOpen(true); input.current?.focus(); }} />
        <kbd aria-label={labels.shortcut} className="mr-1.5 hidden rounded-md border border-ink-200 bg-white px-1.5 py-0.5 font-sans text-[11px] font-semibold text-ink-400 xl:block">/</kbd>
      </form>
      {c.open && (
        <div className="search-pop absolute inset-x-0 top-[calc(100%+10px)] z-50 max-h-[min(72vh,640px)] overflow-y-auto overscroll-contain rounded-[24px] border border-[#e6ecf7] bg-white p-2 shadow-[0_30px_80px_-30px_rgb(12_30_80/0.5)]">
          <SearchPanel store={store} labels={labels} sections={c.sections} active={c.active} setActive={c.setActive} onChoose={choose}
            onClearRecent={clearRecentSearches} listId={listId} query={c.deferred} noResults={c.noResults} loading={c.loading} />
        </div>
      )}
    </div>
  );
}

/** Tlačítko s lupou + celoobrazovkové hledání (mobil, zadokované menu na desktopu). */
export function SearchLauncher({ store, labels, lang, className, iconSize = 22 }: Props & { className?: string; iconSize?: number }) {
  const c = useSearchController(store, labels);
  const router = useRouter();
  const listId = useId();
  const isClient = useSyncExternalStore(noSubscribe, () => true, () => false);
  const trigger = useRef<HTMLButtonElement>(null);
  const overlay = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const { open, setOpen } = c;
  // iOS ukáže klávesnici jen při focusu přímo v obsluze kliknutí → pole existuje předem a zaměří se hned
  const openNow = () => {
    if (overlay.current) overlay.current.inert = false;
    input.current?.focus({ preventScroll: true });
    setOpen(true);
  };
  const close = () => { setOpen(false); trigger.current?.focus({ preventScroll: true }); };
  const submit = () => {
    const q = c.query.trim();
    if (!q) return;
    addRecentSearch(q);
    setOpen(false);
    navigate(router, storePath(store, `/hledat?q=${encodeURIComponent(q)}`));
  };
  const choose = (e: Entry) => {
    if (e.q !== undefined) { c.setQuery(e.q); return; }
    if (c.query.trim()) addRecentSearch(c.query);
    setOpen(false);
  };
  useEffect(() => {
    const onOpen = () => {
      if (trigger.current?.offsetParent === null) return;
      if (overlay.current) overlay.current.inert = false;
      setOpen(true);
      requestAnimationFrame(() => input.current?.focus({ preventScroll: true }));
    };
    window.addEventListener("color:open-search", onOpen);
    return () => window.removeEventListener("color:open-search", onOpen);
  }, [setOpen]);
  useEffect(() => {
    if (!open) return;
    const html = document.documentElement;
    const prev = html.style.overflow;
    html.style.overflow = "hidden";
    const onKey = (e: globalThis.KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => { html.style.overflow = prev; window.removeEventListener("keydown", onKey); };
  }, [open, setOpen]);
  return (
    <>
      <button ref={trigger} type="button" onClick={openNow} aria-label={labels.open} aria-haspopup="dialog" className={className}>
        <SearchIcon size={iconSize} />
      </button>
      {isClient && createPortal(
        <div ref={overlay} data-open={c.open} inert={!c.open} role="dialog" aria-modal="true" aria-label={labels.label} className="search-overlay fixed inset-0 z-[80]">
          <div className="absolute inset-0 bg-ink-950/45 backdrop-blur-[6px]" onClick={() => setOpen(false)} />
          <div className="search-sheet absolute inset-x-0 top-0 flex max-h-[100dvh] flex-col bg-white shadow-2xl lg:inset-x-auto lg:left-1/2 lg:top-[9vh] lg:max-h-[80vh] lg:w-[min(720px,92vw)] lg:-translate-x-1/2 lg:rounded-[28px]">
            <form role="search" onSubmit={(e) => { e.preventDefault(); submit(); }} className="flex items-center gap-2 border-b border-ink-100 px-3 pb-3 pt-[max(12px,env(safe-area-inset-top))] lg:px-4 lg:pt-4">
              <div className="flex h-12 min-w-0 flex-1 items-center gap-1.5 rounded-full bg-[#f1f4fd] pl-4 pr-1.5 transition focus-within:bg-white focus-within:ring-2 focus-within:ring-brand-200">
                <SearchIcon size={20} className="shrink-0 text-brand-600" />
                <input ref={input} type="search" name="q" value={c.query} onChange={(e) => c.setQuery(e.target.value)} onKeyDown={(e) => handleKeys(e, c, listId, close)}
                  role="combobox" aria-expanded={c.open} aria-controls={listId} aria-autocomplete="list" aria-activedescendant={c.active >= 0 ? `${listId}-${c.active}` : undefined}
                  aria-label={labels.label} placeholder={labels.placeholder} autoComplete="off" autoCorrect="off" spellCheck={false} enterKeyHint="search"
                  className="h-full min-w-0 flex-1 bg-transparent text-[17px] text-ink-900 placeholder:text-ink-400 focus:outline-none [&::-webkit-search-cancel-button]:hidden" />
                {c.query && (
                  <button type="button" onClick={() => { c.setQuery(""); input.current?.focus(); }} aria-label={labels.clear} className="grid size-9 shrink-0 place-items-center rounded-full text-ink-500 active:bg-ink-100">
                    <CloseIcon size={17} />
                  </button>
                )}
                <VoiceButton lang={lang} label={labels.voice} onText={(t) => c.setQuery(t)} />
              </div>
              <button type="button" onClick={close} className="h-11 shrink-0 px-2 text-[15px] font-semibold text-brand-700">{labels.cancel}</button>
            </form>
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-1.5 pb-[max(16px,env(safe-area-inset-bottom))] pt-2 lg:px-2.5">
              <SearchPanel store={store} labels={labels} sections={c.sections} active={c.active} setActive={c.setActive} onChoose={choose}
                onClearRecent={clearRecentSearches} listId={listId} query={c.deferred} noResults={c.noResults} loading={c.loading} />
            </div>
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}
