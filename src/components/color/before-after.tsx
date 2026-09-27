"use client";

import Image from "next/image";
import { useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import { ChevronLeftIcon, ChevronRightIcon } from "@/components/icons";

/** Porovnání „bez brýlí / s brýlemi“: tažením nebo šipkami. Levá část = šedý svět, pravá = barevný. */
export function BeforeAfter({ before, after, alt, labels, initial = 50 }: {
  before: string;
  after: string;
  alt: string;
  labels: { without: string; with: string; slider: string };
  initial?: number;
}) {
  const [pos, setPos] = useState(initial);
  const ref = useRef<HTMLDivElement>(null);
  const drag = useRef(false);
  const move = (clientX: number) => {
    const r = ref.current?.getBoundingClientRect();
    if (r) setPos(Math.min(97, Math.max(3, ((clientX - r.left) / r.width) * 100)));
  };
  const onDown = (e: PointerEvent<HTMLButtonElement>) => {
    drag.current = true;
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onMove = (e: PointerEvent<HTMLButtonElement>) => { if (drag.current) move(e.clientX); };
  const onUp = (e: PointerEvent<HTMLButtonElement>) => {
    drag.current = false;
    e.currentTarget.releasePointerCapture(e.pointerId);
  };
  const onKey = (e: KeyboardEvent) => {
    if (e.key === "ArrowLeft") setPos((p) => Math.max(3, p - 5));
    if (e.key === "ArrowRight") setPos((p) => Math.min(97, p + 5));
  };
  const frame = "absolute inset-y-0 right-0 w-full lg:w-[116%]";
  const img = "object-cover object-[64%_28%] lg:object-[center_30%]";
  return (
    <div ref={ref} className="absolute inset-0 overflow-hidden">
      <div className={frame}><Image src={after} alt={alt} fill preload sizes="(min-width: 1024px) 116vw, 100vw" quality={80} className={img} /></div>
      <div className="absolute inset-0" style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }}>
        <div className={frame}><Image src={before} alt="" fill preload sizes="(min-width: 1024px) 116vw, 100vw" quality={78} className={img} /></div>
      </div>
      <div className="pointer-events-none absolute inset-y-0 z-[5] w-0" style={{ left: `${pos}%` }}>
        <span className="absolute inset-y-0 -left-px w-[2px] bg-gradient-to-b from-white/0 via-white/90 to-white/40 shadow-[0_0_14px_3px_rgb(190_220_255/0.75)]" />
        <button type="button" role="slider" aria-label={labels.slider} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(pos)}
          onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onKeyDown={onKey}
          className="pointer-events-auto absolute left-0 top-[20%] grid size-11 lg:top-[44%] -translate-x-1/2 -translate-y-1/2 cursor-ew-resize touch-none place-items-center rounded-full bg-white text-ink-900 shadow-[0_6px_20px_rgb(0_0_0/0.35)] lg:size-12">
          <span className="flex items-center"><ChevronLeftIcon size={15} /><ChevronRightIcon size={15} className="-ml-1" /></span>
        </button>
        <span className="absolute right-3 top-[27%] whitespace-nowrap lg:top-[58%] rounded-md bg-black/60 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wide text-white backdrop-blur">{labels.without}</span>
        <span className="absolute left-3 top-[27%] whitespace-nowrap lg:top-[58%] rounded-md bg-black/60 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wide text-white backdrop-blur">{labels.with}</span>
      </div>
    </div>
  );
}
