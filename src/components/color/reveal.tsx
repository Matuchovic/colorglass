"use client";

import { useEffect, useRef } from "react";

const reduced = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Odhaluje prvky s atributem data-reveal při scrollu. Co je už na obrazovce, zůstane viditelné (bez probliknutí). */
export function RevealObserver() {
  useEffect(() => {
    if (reduced()) return;
    const els = Array.from(document.querySelectorAll<HTMLElement>("[data-reveal]"));
    const vh = window.innerHeight;
    for (const el of els) {
      const r = el.getBoundingClientRect();
      if (r.height > 0 && r.top < vh * 0.92 && r.bottom > 0) el.classList.add("is-visible");
    }
    document.documentElement.classList.add("reveal-on");
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (e.isIntersecting) {
          e.target.classList.add("is-visible");
          io.unobserve(e.target);
        }
      }
    }, { rootMargin: "0px 0px -6% 0px", threshold: 0.12 });
    for (const el of els) if (!el.classList.contains("is-visible")) io.observe(el);
    return () => {
      io.disconnect();
      document.documentElement.classList.remove("reveal-on");
    };
  }, []);
  return null;
}

/** Číslo, které se napočítá, když se objeví na obrazovce (bez JS zobrazí rovnou konečnou hodnotu). */
export function CountUp({ to, suffix = "", duration = 1500 }: { to: number; suffix?: string; duration?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const node = ref.current?.firstChild;
    if (!ref.current || !node || reduced()) return;
    let raf = 0;
    const io = new IntersectionObserver(([entry]) => {
      if (!entry?.isIntersecting) return;
      io.disconnect();
      const start = performance.now();
      const tick = (now: number) => {
        const k = Math.min(1, (now - start) / duration);
        node.nodeValue = `${Math.round(to * (1 - Math.pow(1 - k, 3)))}${suffix}`;
        if (k < 1) raf = requestAnimationFrame(tick);
      };
      node.nodeValue = `0${suffix}`;
      raf = requestAnimationFrame(tick);
    }, { threshold: 0.6 });
    io.observe(ref.current);
    return () => { io.disconnect(); cancelAnimationFrame(raf); };
  }, [to, suffix, duration]);
  return <span ref={ref}>{`${to}${suffix}`}</span>;
}
