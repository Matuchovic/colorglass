import Link from "next/link";
import { ChevronRightIcon } from "@/components/icons";

/** Drobečková navigace + strukturovaná data BreadcrumbList. */
export function Breadcrumbs({ items, baseUrl }: { items: Array<{ name: string; href?: string }>; baseUrl: string }) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      ...(item.href ? { item: `${baseUrl}${item.href}` } : {}),
    })),
  };
  return (
    <nav aria-label="Breadcrumb" className="text-sm text-ink-500">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <ol className="flex flex-wrap items-center gap-1.5">
        {items.map((item, i) => (
          <li key={`${item.name}-${i}`} className="flex items-center gap-1.5">
            {i > 0 && <ChevronRightIcon size={14} className="text-ink-300" />}
            {item.href && i < items.length - 1 ? (
              <Link href={item.href} className="hover:text-brand-700">{item.name}</Link>
            ) : (
              <span aria-current={i === items.length - 1 ? "page" : undefined} className="text-ink-700">{item.name}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
