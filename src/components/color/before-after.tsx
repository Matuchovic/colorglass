"use client";

import Image from "next/image";
import { useRef, useState, type AnimationEvent, type CSSProperties, type KeyboardEvent, type PointerEvent } from "react";
import { ChevronLeftIcon, ChevronRightIcon } from "@/components/icons";
import { cn } from "@/lib/utils";

const clamp = (v: number) => Math.min(97, Math.max(3, v));

/**
 * Porovnání „bez brýlí / s brýlemi“. Chytit lze kdekoli na fotce (myš i prst), úchyt ovládají i šipky.
 * Poloha jde přímo do CSS proměnné --pos (bez překreslování Reactu → plynulé tažení).
 * Po načtení efekt jednou předvede čistě v CSS (animace registrované proměnné --pos), dokud uživatel nesáhne.
 */
export function BeforeAfter({ before, after, alt, labels, initial = 51 }: {
  before: string;
  after: string;
  alt: string;
  labels: { without: string; with: string; slider: string };
  initial?: number;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const pos = useRef(initial);
  const drag = useRef<{ id: number; x: number; y: number; live: boolean } | null>(null);
  const [value, setValue] = useState(initial);
  const [dragging, setDragging] = useState(false);
  const [touched, setTouched] = useState(false);
  const [intro, setIntro] = useState(true);

  const apply = (v: number) => {
    pos.current = clamp(v);
    rootRef.current?.style.setProperty("--pos", `${pos.current}%`);
  };
  const fromClientX = (clientX: number) => {
    const r = rootRef.current?.getBoundingClientRect();
    if (r && r.width > 0) apply(((clientX - r.left) / r.width) * 100);
  };
  const stopIntro = () => setIntro(false);
  const onAnimationEnd = (e: AnimationEvent<HTMLDivElement>) => {
    if (e.animationName === "color-ba-intro") setIntro(false);
  };


  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    stopIntro();
    setTouched(true);
    const live = e.pointerType !== "touch"; // prst: čekáme, zda jde o vodorovný posun, nebo scroll
    drag.current = { id: e.pointerId, x: e.clientX, y: e.clientY, live };
    if (live) {
      e.preventDefault();
      e.currentTarget.setPointerCapture(e.pointerId);
      setDragging(true);
      fromClientX(e.clientX);
    }
  };
  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    if (!d.live) {
      const dx = Math.abs(e.clientX - d.x);
      const dy = Math.abs(e.clientY - d.y);
      if (dy > 10 && dy > dx) {
        drag.current = null;
        return;
      }
      if (dx < 6) return;
      d.live = true;
      e.currentTarget.setPointerCapture(e.pointerId);
      setDragging(true);
    }
    fromClientX(e.clientX);
  };
  const onPointerEnd = (e: PointerEvent<HTMLDivElement>) => {
    if (drag.current?.id !== e.pointerId) return;
    drag.current = null;
    setDragging(false);
    setValue(Math.round(pos.current));
  };
  const onKey = (e: KeyboardEvent<HTMLButtonElement>) => {
    const step = e.shiftKey ? 10 : 4;
    const moves: Record<string, number> = { ArrowLeft: -step, ArrowDown: -step, ArrowRight: step, ArrowUp: step };
    const next = e.key in moves ? pos.current + moves[e.key]! : e.key === "Home" ? 3 : e.key === "End" ? 97 : null;
    if (next === null) return;
    e.preventDefault();
    stopIntro();
    setTouched(true);
    apply(next);
    setValue(Math.round(pos.current));
  };

  const frame = "absolute inset-y-0 right-0 w-full lg:w-[116%]";
  const img = "ba-kenburns object-cover object-[64%_28%] lg:object-[center_30%]";
  const label = "absolute top-[17.5%] whitespace-nowrap rounded-lg border border-white/15 bg-black/45 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-white backdrop-blur-md lg:top-[58%]";
  return (
    <div ref={rootRef} onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerEnd} onPointerCancel={onPointerEnd} onAnimationEnd={onAnimationEnd}
      className={cn("absolute inset-0 touch-pan-y select-none overflow-hidden", intro && "ba-intro", dragging ? "cursor-grabbing" : "cursor-grab")}
      style={{ "--pos": `${initial}%` } as CSSProperties}>
      <div className={frame}>
        <Image src={after} alt={alt} fill preload draggable={false} sizes="(min-width: 1024px) 116vw, 100vw" quality={80} className={img} />
      </div>
      <div className="absolute inset-0" style={{ clipPath: "inset(0 calc(100% - var(--pos)) 0 0)" }}>
        <div className={frame}>
          <Image src={before} alt="" fill preload draggable={false} sizes="(min-width: 1024px) 116vw, 100vw" quality={78} className={img} />
        </div>
      </div>
      <div className="pointer-events-none absolute inset-y-0 z-[5] w-0" style={{ left: "var(--pos)" }}>
        <span aria-hidden="true" className="absolute inset-y-0 -left-[9px] w-[18px] bg-[linear-gradient(180deg,#ff3d6e,#ffb020,#ffe95a,#35e08a,#22d3ee,#3b82f6,#a855f7)] opacity-45 blur-[12px]" />
        <span aria-hidden="true" className="absolute inset-y-0 -left-px w-[2px] bg-gradient-to-b from-white/20 via-white to-white/40 shadow-[0_0_14px_3px_rgb(210_230_255/0.75)]" />
        <button type="button" role="slider" aria-label={labels.slider} aria-valuemin={0} aria-valuemax={100} aria-valuenow={value} onKeyDown={onKey}
          className={cn("pointer-events-auto absolute left-0 top-[11%] grid size-14 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border border-white/80 bg-white/85 text-ink-900 shadow-[0_10px_30px_rgb(0_0_0/0.35)] backdrop-blur-md transition-[scale] duration-200 hover:scale-110 lg:top-[44%]",
            dragging ? "scale-110 cursor-grabbing" : "cursor-grab")}>
          {!touched && <span aria-hidden="true" className="ping-ring absolute inset-0 rounded-full border-2 border-white" />}
          <span className="flex items-center"><ChevronLeftIcon size={17} /><ChevronRightIcon size={17} className="-ml-1" /></span>
        </button>
        <span className={cn(label, "right-4")}>{labels.without}</span>
        <span className={cn(label, "left-4")}>{labels.with}</span>
      </div>
    </div>
  );
}
