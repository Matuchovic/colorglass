"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Záložky produktů: plovoucí indikátor aktivní záložky, obsah všech záložek vykreslený serverem. */
export function ProductTabs({ title, tabs, panels }: { title: string; tabs: string[]; panels: ReactNode[] }) {
  const [active, setActive] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);
  const pillRef = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const list = listRef.current;
    const pill = pillRef.current;
    if (!list || !pill) return;
    const place = () => {
      const btn = list.querySelectorAll<HTMLButtonElement>('[role="tab"]')[active];
      if (!btn) return;
      pill.style.width = `${btn.offsetWidth}px`;
      pill.style.transform = `translateX(${btn.offsetLeft}px)`;
      pill.style.opacity = "1";
      list.dataset.pill = "on";
    };
    place();
    const ro = new ResizeObserver(place);
    ro.observe(list);
    return () => ro.disconnect();
  }, [active]);
  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 data-reveal="" className="font-display text-[26px] font-extrabold tracking-[-0.015em] text-ink-950 sm:text-[28px]">{title}</h2>
        <div ref={listRef} role="tablist" aria-label={title} className="group relative -mx-4 flex gap-2 overflow-x-auto px-4 pb-1 scrollbar-none sm:mx-0 sm:px-0">
          <span ref={pillRef} aria-hidden="true" className="pointer-events-none absolute left-0 top-0 z-[1] h-9 rounded-full bg-navy opacity-0 shadow-[0_8px_20px_-8px_rgb(20_33_50/0.8)] transition-[transform,width] duration-500 ease-[cubic-bezier(0.2,0.8,0.2,1)]" />
          {tabs.map((tab, i) => (
            <button key={tab} type="button" role="tab" id={`tab-${i}`} aria-selected={active === i} aria-controls={`panel-${i}`} onClick={() => setActive(i)}
              className={cn("relative h-9 shrink-0 rounded-full px-5 text-[13.5px] font-medium transition-colors duration-300",
                active === i ? "bg-navy text-white group-data-[pill=on]:bg-[#f1f4f9]" : "bg-[#f1f4f9] text-ink-800 hover:bg-[#e7ecf5]")}>
              <span className="relative z-[2]">{tab}</span>
            </button>
          ))}
        </div>
      </div>
      {panels.map((panel, i) => (
        <div key={tabs[i]} role="tabpanel" id={`panel-${i}`} aria-labelledby={`tab-${i}`} hidden={active !== i} className="panel-in mt-6">
          {panel}
        </div>
      ))}
    </div>
  );
}
