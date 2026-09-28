"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";

type Router = ReturnType<typeof useRouter>;
type VTDocument = Document & { startViewTransition?: (cb: () => Promise<void>) => { finished: Promise<void> } };

let pending: (() => void) | null = null;
let progressEl: HTMLElement | null = null;

function startProgress() {
  if (progressEl) progressEl.dataset.state = "loading";
}
function doneProgress() {
  if (!progressEl || progressEl.dataset.state !== "loading") return;
  progressEl.dataset.state = "done";
  window.setTimeout(() => { if (progressEl?.dataset.state === "done") progressEl.dataset.state = "idle"; }, 600);
}
const reduced = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Navigace s plynulým přechodem stránek (View Transitions API). Bez podpory prohlížeče běžná navigace. */
export function navigate(router: Router, href: string) {
  startProgress();
  const doc = document as VTDocument;
  if (!doc.startViewTransition || reduced()) {
    router.push(href);
    return;
  }
  doc.startViewTransition(() => new Promise<void>((resolve) => {
    const finish = () => {
      if (pending === finish) pending = null;
      resolve();
    };
    pending = finish;
    router.push(href);
    window.setTimeout(finish, 2500); // pojistka: stránka nesmí zamrznout
  }));
}

/**
 * Plynulé přechody mezi stránkami + duhový ukazatel načítání nahoře.
 * Zachytí kliknutí na interní odkazy (i Next <Link>), starou stránku rozplyne a novou vysune;
 * prvky se stejným view-transition-name (fotka brýlí na kartě → v detailu) se „přelijí“.
 */
export function ViewTransitions() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const bar = useRef<HTMLDivElement>(null);
  useEffect(() => {
    progressEl = bar.current;
    return () => { progressEl = null; };
  }, []);
  useEffect(() => {
    const finish = pending;
    if (finish) requestAnimationFrame(() => requestAnimationFrame(finish));
    doneProgress();
  }, [pathname, params]);
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as Element | null)?.closest?.("a");
      if (!a || !a.href || (a.target && a.target !== "_self") || a.hasAttribute("download") || a.dataset.noTransition !== undefined) return;
      const url = new URL(a.href, window.location.href);
      if (url.origin !== window.location.origin || url.pathname.startsWith("/api/") || url.pathname.startsWith("/auth/")) return;
      if (url.pathname === window.location.pathname && url.search === window.location.search) return;
      e.preventDefault();
      navigate(router, url.pathname + url.search + url.hash);
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [router]);
  return <div ref={bar} data-state="idle" className="nav-progress" aria-hidden="true" />;
}
