"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { ChevronLeftIcon, ChevronRightIcon, CloseIcon } from "@/components/icons";
import { fmt } from "@/i18n";
import { cn } from "@/lib/utils";

type Img = { id: string; url: string; alt: string };

/** Galerie produktu: náhledy, video, zvětšení (lightbox) s ovládáním klávesnicí. */
export function ProductGallery({ images, videoEmbed, labels, transitionName }: {
  transitionName?: string;
  images: Img[];
  videoEmbed: string | null;
  labels: { zoom: string; prev: string; next: string; image: string; video: string; close: string };
}) {
  const [active, setActive] = useState(0);
  const [zoom, setZoom] = useState(false);
  const total = images.length + (videoEmbed ? 1 : 0);
  const isVideo = videoEmbed !== null && active === images.length;
  const current = images[active];

  useEffect(() => {
    if (!zoom) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setZoom(false);
      if (e.key === "ArrowRight") setActive((i) => (i + 1) % images.length);
      if (e.key === "ArrowLeft") setActive((i) => (i - 1 + images.length) % images.length);
    };
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
    };
  }, [zoom, images.length]);

  return (
    <div>
      <div data-gallery-main="" className="relative aspect-square overflow-hidden rounded-card bg-surface"
        style={transitionName && current && current === images[0] ? { viewTransitionName: transitionName } : undefined}>
        {isVideo ? (
          <iframe src={videoEmbed} title={labels.video} className="absolute inset-0 size-full" loading="lazy"
            allow="accelerometer; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
        ) : current ? (
          <button type="button" onClick={() => setZoom(true)} aria-label={labels.zoom} className="absolute inset-0 cursor-zoom-in">
            <Image src={current.url} alt={current.alt} fill preload sizes="(min-width: 1024px) 600px, 100vw" className="object-contain p-6 sm:p-10" />
          </button>
        ) : null}
      </div>
      {total > 1 && (
        <ul className="mt-3 flex gap-2.5 overflow-x-auto pb-1 scrollbar-none">
          {images.map((img, i) => (
            <li key={img.id}>
              <button type="button" onClick={() => setActive(i)} aria-label={fmt(labels.image, { n: i + 1, total })} aria-current={i === active}
                className={cn("relative block size-20 overflow-hidden rounded-field bg-surface ring-2 transition", i === active ? "ring-brand-600" : "ring-transparent hover:ring-ink-200")}>
                <Image src={img.url} alt="" fill sizes="80px" className="object-contain p-1.5" />
              </button>
            </li>
          ))}
          {videoEmbed && (
            <li>
              <button type="button" onClick={() => setActive(images.length)} aria-current={isVideo}
                className={cn("grid size-20 place-items-center rounded-field bg-ink-900 text-xs font-bold text-white ring-2 transition", isVideo ? "ring-brand-600" : "ring-transparent")}>
                ▶ {labels.video}
              </button>
            </li>
          )}
        </ul>
      )}
      {zoom && current && (
        <div role="dialog" aria-modal="true" aria-label={current.alt} className="fixed inset-0 z-[80] flex animate-fade-in items-center justify-center bg-ink-950/90 p-4">
          <button type="button" onClick={() => setZoom(false)} aria-label={labels.close} className="absolute right-4 top-4 rounded-full bg-white/10 p-3 text-white hover:bg-white/20">
            <CloseIcon size={24} />
          </button>
          {images.length > 1 && (
            <button type="button" onClick={() => setActive((i) => (i - 1 + images.length) % images.length)} aria-label={labels.prev}
              className="absolute left-4 rounded-full bg-white/10 p-3 text-white hover:bg-white/20">
              <ChevronLeftIcon size={26} />
            </button>
          )}
          <div className="relative h-[85vh] w-full max-w-5xl">
            <Image src={current.url} alt={current.alt} fill sizes="100vw" quality={85} className="object-contain" />
          </div>
          {images.length > 1 && (
            <button type="button" onClick={() => setActive((i) => (i + 1) % images.length)} aria-label={labels.next}
              className="absolute right-4 rounded-full bg-white/10 p-3 text-white hover:bg-white/20">
              <ChevronRightIcon size={26} />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
