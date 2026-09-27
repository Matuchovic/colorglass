import Image from "next/image";
import Link from "next/link";
import type { Dictionary } from "@/i18n";
import { storePath, type StoreCode } from "@/lib/store";

const IMAGES: Record<string, string> = {
  "": "/images/products/color-sport.webp", protan: "/images/products/color-protan.webp", deutan: "/images/products/color-deutan.webp",
  tritan: "/images/products/color-pro-outdoor.webp", indoor: "/images/products/color-indoor.webp", outdoor: "/images/products/color-tritan.webp",
  "clip-on": "/images/products/color-clip-on.webp", detske: "/images/products/color-kids.webp",
};

export function CategoryTiles({ store, t }: { store: StoreCode; t: Dictionary }) {
  return (
    <ul className="-mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-1 scrollbar-none md:mx-0 md:grid md:grid-cols-4 md:overflow-visible md:px-0 lg:grid-cols-8 lg:gap-[14px]">
      {t.color.categories.map((c, i) => (
        <li key={c.title} className="w-[150px] shrink-0 snap-start md:w-auto">
          <Link href={storePath(store, c.slug ? `/kategorie/bryle/${c.slug}` : "/kategorie/bryle")}
            className="group flex h-full flex-col rounded-[16px] bg-tile px-3.5 pb-4 pt-3 ring-1 ring-[#edf1f7] transition hover:-translate-y-0.5 hover:bg-white hover:shadow-lift">
            <span className="relative mx-auto block h-[86px] w-full">
              <Image src={IMAGES[c.slug]!} alt="" fill sizes="150px" className="object-contain transition duration-500 group-hover:scale-105" />
            </span>
            <span className="mt-2 font-display text-[15.5px] font-bold text-ink-950">{c.title}</span>
            {i === 0 ? (
              <span className="mt-1 inline-flex w-fit items-center gap-1.5 border-b-2 border-[image:linear-gradient(90deg,#0c60fe,#8b5cf6)_1] pb-0.5 text-[13px] font-medium text-ink-700">{c.text} →</span>
            ) : (
              <span className="mt-1 text-[13px] leading-snug text-ink-600">{c.text}</span>
            )}
          </Link>
        </li>
      ))}
    </ul>
  );
}
