"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export function AccountNav({ items }: { items: Array<{ href: string; label: string }> }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Účet">
      <ul className="flex gap-1 overflow-x-auto pb-1 scrollbar-none lg:flex-col lg:overflow-visible">
        {items.map((item, i) => {
          const active = i === 0 ? pathname === item.href : pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <li key={item.href} className="shrink-0">
              <Link href={item.href} aria-current={active ? "page" : undefined}
                className={cn("block rounded-field px-4 py-2.5 text-sm font-medium transition", active ? "bg-brand-50 text-brand-800" : "text-ink-700 hover:bg-surface hover:text-ink-900")}>
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
