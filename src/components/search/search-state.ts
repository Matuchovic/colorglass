"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import type { SearchIndex } from "@/lib/smart-search";
import type { StoreCode } from "@/lib/store";

// ── Index: stáhne se jednou (při prvním otevření hledání), pak se hledá bez sítě ──
const indexCache = new Map<string, Promise<SearchIndex>>();
export function loadSearchIndex(store: StoreCode): Promise<SearchIndex> {
  let p = indexCache.get(store);
  if (!p) {
    p = fetch(`/api/search/index/${store}`).then((r) => {
      if (!r.ok) throw new Error(String(r.status));
      return r.json() as Promise<SearchIndex>;
    });
    p.catch(() => indexCache.delete(store));
    indexCache.set(store, p);
  }
  return p;
}
export function useSearchIndex(store: StoreCode, active: boolean): SearchIndex | null {
  const [index, setIndex] = useState<SearchIndex | null>(null);
  useEffect(() => {
    if (!active || index) return;
    let alive = true;
    loadSearchIndex(store).then((i) => { if (alive) setIndex(i); }, () => undefined);
    return () => { alive = false; };
  }, [store, active, index]);
  return index;
}

// ── Nedávná hledání (localStorage, sdílené mezi všemi vyhledávacími poli) ──
const RECENT_KEY = "color_recent_search";
const EMPTY: string[] = [];
let recentCache: string[] | null = null;
const listeners = new Set<() => void>();
function readRecent(): string[] {
  if (recentCache) return recentCache;
  try {
    const v: unknown = JSON.parse(localStorage.getItem(RECENT_KEY) ?? "[]");
    recentCache = Array.isArray(v) ? v.filter((x): x is string => typeof x === "string").slice(0, 6) : [];
  } catch {
    recentCache = [];
  }
  return recentCache;
}
function emit(next: string[]) {
  recentCache = next;
  try { localStorage.setItem(RECENT_KEY, JSON.stringify(next)); } catch { /* soukromý režim */ }
  listeners.forEach((l) => l());
}
export function useRecentSearches(): string[] {
  return useSyncExternalStore((cb) => { listeners.add(cb); return () => { listeners.delete(cb); }; }, readRecent, () => EMPTY);
}
export function addRecentSearch(q: string) {
  const v = q.trim();
  if (v.length < 2) return;
  emit([v, ...readRecent().filter((x) => x.toLowerCase() !== v.toLowerCase())].slice(0, 6));
}
export function clearRecentSearches() {
  emit([]);
}

// ── Hlasové hledání (Web Speech API: Chrome, Edge, Safari) ──
type RecResult = ArrayLike<{ transcript: string }> & { isFinal: boolean };
type Recognition = {
  lang: string; interimResults: boolean; continuous: boolean; maxAlternatives: number;
  start(): void; stop(): void; abort(): void;
  onresult: ((e: { results: ArrayLike<RecResult> }) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
};
type RecognitionCtor = new () => Recognition;
function recognitionCtor(): RecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: RecognitionCtor; webkitSpeechRecognition?: RecognitionCtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}
const noSubscribe = () => () => {};
export function useVoiceSearch(lang: string, onText: (text: string, final: boolean) => void) {
  const supported = useSyncExternalStore(noSubscribe, () => recognitionCtor() !== null, () => false);
  const [listening, setListening] = useState(false);
  const rec = useRef<Recognition | null>(null);
  const handler = useRef(onText);
  useEffect(() => { handler.current = onText; });
  useEffect(() => () => rec.current?.abort(), []);
  const stop = useCallback(() => rec.current?.stop(), []);
  const start = useCallback(() => {
    const Ctor = recognitionCtor();
    if (!Ctor) return;
    rec.current?.abort();
    const r = new Ctor();
    r.lang = lang;
    r.interimResults = true;
    r.continuous = false;
    r.maxAlternatives = 1;
    r.onresult = (e) => {
      let text = "";
      let final = false;
      for (let i = 0; i < e.results.length; i++) {
        text += e.results[i]![0]!.transcript;
        if (e.results[i]!.isFinal) final = true;
      }
      handler.current(text.trim(), final);
    };
    r.onend = () => { setListening(false); rec.current = null; };
    r.onerror = () => setListening(false);
    rec.current = r;
    setListening(true);
    try { r.start(); } catch { setListening(false); }
  }, [lang]);
  return { supported, listening, start, stop };
}
