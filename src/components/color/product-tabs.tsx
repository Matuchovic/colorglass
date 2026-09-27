"use client";

import { useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Záložky produktů: obsah všech záložek je vykreslen na serveru, klient jen přepíná viditelnost. */
export function ProductTabs({ title, tabs, panels }: { title: string; tabs: string[]; panels: ReactNode[] }) {
  const [active, setActive] = useState(0);
  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 className="font-display text-[26px] font-extrabold tracking-[-0.015em] text-ink-950 sm:text-[28px]">{title}</h2>
        <div role="tablist" aria-label={title} className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 scrollbar-none sm:mx-0 sm:px-0">
          {tabs.map((tab, i) => (
            <button key={tab} type="button" role="tab" id={`tab-${i}`} aria-selected={active === i} aria-controls={`panel-${i}`} onClick={() => setActive(i)}
              className={cn("h-9 shrink-0 rounded-full px-5 text-[13.5px] font-medium transition",
                active === i ? "bg-navy text-white shadow-[0_6px_16px_-8px_rgb(20_33_50/0.8)]" : "bg-[#f1f4f9] text-ink-800 hover:bg-[#e7ecf5]")}>
              {tab}
            </button>
          ))}
        </div>
      </div>
      {panels.map((panel, i) => (
        <div key={tabs[i]} role="tabpanel" id={`panel-${i}`} aria-labelledby={`tab-${i}`} hidden={active !== i} className="mt-6">
          {panel}
        </div>
      ))}
    </div>
  );
}
