"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import type { StoreCode } from "@/lib/store";
import type { Dictionary } from "@/i18n";
import { CheckIcon, CloseIcon } from "@/components/icons";

export type ClientLabels = Pick<Dictionary, "cart" | "wishlist" | "preview" | "errors" | "newsletter" | "search" | "common"> & {
  product: Pick<Dictionary["product"], "addToCart" | "chooseVariant" | "outOfStock" | "wishlistAdd" | "wishlistRemove">;
};

type Tone = "success" | "info" | "error";
export type SessionUser = { name: string };
// Na těchto stránkách se mění přihlášení → stav v hlavičce načteme znovu (jinde zůstává web statický)
const SESSION_PAGES = /\/(muj-ucet|prihlaseni|registrace|nove-heslo|objednavka|pokladna)(\/|$)/;
type Toast = { id: number; message: string; tone: Tone };

interface ShopContextValue {
  store: StoreCode;
  preview: boolean;
  labels: ClientLabels;
  cartCount: number;
  setCartCount: (count: number) => void;
  user: SessionUser | null;
  setUser: (user: SessionUser | null) => void;
  refreshSession: () => void;
  wishlist: string[];
  toggleWishlist: (productId: string) => boolean;
  toast: (message: string, tone?: Tone) => void;
}

const ShopContext = createContext<ShopContextValue | null>(null);

export function useShop(): ShopContextValue {
  const ctx = useContext(ShopContext);
  if (!ctx) throw new Error("useShop musí být uvnitř ShopProvider");
  return ctx;
}

// Oblíbené produkty anonymně v localStorage (po přihlášení se budou synchronizovat do účtu)
const WISHLIST_KEY = "color_wishlist_v1";
const EMPTY: string[] = [];
let wishlistCache: string[] | null = null;
const listeners = new Set<() => void>();

function readWishlist(): string[] {
  if (wishlistCache) return wishlistCache;
  try {
    const parsed: unknown = JSON.parse(window.localStorage.getItem(WISHLIST_KEY) ?? "[]");
    wishlistCache = Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === "string").slice(0, 200) : [];
  } catch {
    wishlistCache = [];
  }
  return wishlistCache;
}

function writeWishlist(ids: string[]) {
  wishlistCache = ids;
  try {
    window.localStorage.setItem(WISHLIST_KEY, JSON.stringify(ids));
  } catch {
    // soukromý režim prohlížeče – oblíbené vydrží do obnovení stránky
  }
  listeners.forEach((l) => l());
}

function subscribeWishlist(listener: () => void) {
  listeners.add(listener);
  const onStorage = (e: StorageEvent) => {
    if (e.key === WISHLIST_KEY) {
      wishlistCache = null;
      listener();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

export function ShopProvider({ store, preview, labels, children }: { store: StoreCode; preview: boolean; labels: ClientLabels; children: ReactNode }) {
  const [cartCount, setCartCount] = useState(0);
  const [user, setUser] = useState<SessionUser | null>(null);
  const [sessionTick, setSessionTick] = useState(0);
  const pathname = usePathname();
  const sessionKey = SESSION_PAGES.test(pathname) ? pathname : "static";
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(1);
  const wishlist = useSyncExternalStore(subscribeWishlist, readWishlist, () => EMPTY);

  useEffect(() => {
    if (preview) return;
    let cancelled = false;
    fetch(`/api/cart?store=${store}`, { cache: "no-store", credentials: "same-origin" })
      .then((r) => (r.ok ? (r.json() as Promise<{ count: number; user: SessionUser | null }>) : null))
      .then((data) => {
        if (cancelled || !data) return;
        setCartCount(data.count);
        setUser(data.user ?? null);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [store, preview, sessionKey, sessionTick]);

  const refreshSession = useCallback(() => setSessionTick((n) => n + 1), []);

  const dismiss = useCallback((id: number) => setToasts((all) => all.filter((t) => t.id !== id)), []);

  const toast = useCallback(
    (message: string, tone: Tone = "success") => {
      const id = nextId.current++;
      setToasts((all) => [...all.slice(-2), { id, message, tone }]);
      window.setTimeout(() => dismiss(id), 4500);
    },
    [dismiss],
  );

  const toggleWishlist = useCallback((productId: string) => {
    const current = readWishlist();
    const exists = current.includes(productId);
    writeWishlist(exists ? current.filter((id) => id !== productId) : [productId, ...current].slice(0, 200));
    return !exists;
  }, []);

  const value = useMemo(
    () => ({ store, preview, labels, cartCount, setCartCount, user, setUser, refreshSession, wishlist, toggleWishlist, toast }),
    [store, preview, labels, cartCount, user, refreshSession, wishlist, toggleWishlist, toast],
  );

  return (
    <ShopContext.Provider value={value}>
      {children}
      <div aria-live="polite" role="status" className="pointer-events-none fixed inset-x-0 bottom-4 z-[70] flex flex-col items-center gap-2 px-4 sm:items-end sm:px-6">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto flex w-full max-w-sm animate-toast-in items-start gap-3 rounded-card px-4 py-3 text-sm font-medium shadow-lift ${
              t.tone === "error" ? "bg-danger-600 text-white" : t.tone === "info" ? "bg-ink-900 text-white" : "bg-white text-ink-900 ring-1 ring-ink-100"
            }`}
          >
            {t.tone === "success" && (
              <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-success-500 text-white">
                <CheckIcon size={13} strokeWidth={3} />
              </span>
            )}
            <p className="flex-1 leading-snug">{t.message}</p>
            <button type="button" onClick={() => dismiss(t.id)} className="-m-1 rounded-md p-1 opacity-70 hover:opacity-100" aria-label={labels.common.close}>
              <CloseIcon size={16} />
            </button>
          </div>
        ))}
      </div>
      {preview && (
        <p className="fixed bottom-4 left-4 z-[60] hidden rounded-full bg-ink-900/90 px-3 py-1.5 text-xs font-semibold text-white shadow-lift md:block" title={labels.preview.text}>
          {labels.preview.badge} · {labels.preview.text}
        </p>
      )}
    </ShopContext.Provider>
  );
}
