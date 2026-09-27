"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ChevronDownIcon } from "@/components/icons";
import { FlagCZ, FlagSK } from "@/components/ui/flags";
import type { StoreCode } from "@/lib/store";

/** Jazyk + země v horní liště (CZ/SK obchod, stejná stránka). */
export function StoreSwitch({ store, labels, skEnabled, skDomain, czDomain }: {
  store: StoreCode;
  labels: { language: string; switchTo: string; switchLabel: string };
  skEnabled: boolean;
  skDomain?: string;
  czDomain?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const pathname = usePathname() || "/";
  const basePath = store === "sk" && pathname.startsWith("/sk") ? pathname.slice(3) || "/" : pathname;
  const tail = basePath === "/" ? "" : basePath;
  const href = store === "cz" ? (skDomain ? `${skDomain}${tail}` : `/sk${tail}`) : skDomain && czDomain ? `${czDomain}${tail}` : basePath;

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onDown); document.removeEventListener("keydown", onKey); };
  }, [open]);

  const Flag = store === "sk" ? FlagSK : FlagCZ;
  const Other = store === "sk" ? FlagCZ : FlagSK;
  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={() => skEnabled && setOpen((o) => !o)} aria-expanded={open} aria-label={labels.switchLabel}
        className="flex items-center gap-4 text-[13px] font-semibold text-ink-900">
        <span className="flex items-center gap-1">{labels.language}<ChevronDownIcon size={14} className="text-ink-500" /></span>
        <span aria-hidden="true" className="h-4 w-px bg-ink-200" />
        <span className="flex items-center gap-1.5"><Flag className="h-[13px] w-[19px] rounded-[2px]" /><ChevronDownIcon size={14} className="text-ink-400" /></span>
      </button>
      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-44 rounded-field bg-white p-1.5 shadow-lift ring-1 ring-ink-100">
          <a href={href} hrefLang={store === "cz" ? "sk-SK" : "cs-CZ"} className="flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium text-ink-800 hover:bg-surface">
            <Other className="h-[13px] w-[19px] rounded-[2px]" />{labels.switchTo}
          </a>
        </div>
      )}
    </div>
  );
}
