"use client";

import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import type { StoreCode } from "@/lib/store";

/** Přepnutí CZ/SK na stejnou stránku (cesty jsou v obou obchodech shodné, SK má prefix /sk). */
export function LanguageSwitch({ store, labels, skEnabled, skDomain, className }: {
  store: StoreCode;
  labels: { czech: string; slovak: string; languageLabel: string };
  skEnabled: boolean;
  skDomain?: string;
  className?: string;
}) {
  const pathname = usePathname() || "/";
  const basePath = store === "sk" && pathname.startsWith("/sk") ? pathname.slice(3) || "/" : pathname;
  const czHref = basePath;
  const skHref = skDomain ? `${skDomain}${basePath === "/" ? "" : basePath}` : `/sk${basePath === "/" ? "" : basePath}`;
  return (
    <nav aria-label={labels.languageLabel} className={cn("flex items-center gap-2 text-[13px]", className)}>
      <a href={czHref} hrefLang="cs-CZ" lang="cs" aria-current={store === "cz" ? "true" : undefined}
        className={cn("transition-colors hover:text-brand-700", store === "cz" ? "font-semibold text-ink-900" : "text-ink-600")}>
        {labels.czech}
      </a>
      {skEnabled && (
        <>
          <span aria-hidden="true" className="text-ink-300">|</span>
          <a href={skHref} hrefLang="sk-SK" lang="sk" aria-current={store === "sk" ? "true" : undefined}
            className={cn("transition-colors hover:text-brand-700", store === "sk" ? "font-semibold text-ink-900" : "text-ink-600")}>
            {labels.slovak}
          </a>
        </>
      )}
    </nav>
  );
}
