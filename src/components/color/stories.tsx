"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ChevronLeftIcon, ChevronRightIcon } from "@/components/icons";
import { PlayIcon } from "./icons";
import { fmt } from "@/i18n";

type Story = { quote: string; name: string; type: string; image: string };

/** Skutečné příběhy: pozadí s pomalým přiblížením, skleněné karty, samo se střídá (pauza při najetí), šipky listují dokola. */
export function Stories({ title, items, labels, href, bgAlt }: {
  title: string;
  items: Story[];
  labels: { prev: string; next: string; play: string };
  href: string;
  bgAlt: string;
}) {
  const [offset, setOffset] = useState(0);
  const [paused, setPaused] = useState(false);
  const n = items.length;
  useEffect(() => {
    if (paused || n < 2 || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = window.setInterval(() => setOffset((o) => (o + 1) % n), 6500);
    return () => window.clearInterval(id);
  }, [paused, n]);
  const ordered = items.map((_, i) => items[(i + offset) % n]!);
  const arrow = "absolute top-1/2 z-10 grid size-11 -translate-y-1/2 place-items-center rounded-full border border-white/35 bg-black/30 text-white backdrop-blur transition hover:scale-110 hover:bg-black/55";
  return (
    <section className="relative isolate overflow-hidden bg-[#1b1510]" aria-labelledby="pribehy-nadpis"
      onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)} onFocusCapture={() => setPaused(true)} onBlurCapture={() => setPaused(false)}>
      <Image src="/images/color/family.webp" alt={bgAlt} fill sizes="100vw" className="kenburns -z-10 object-cover object-[30%_42%] brightness-[0.82] saturate-[1.15] sepia-[0.18]" />
      <div aria-hidden="true" className="absolute inset-0 -z-10 bg-[linear-gradient(90deg,rgb(10_7_4/0.8)_0%,rgb(10_7_4/0.4)_30%,rgb(10_7_4/0.5)_46%,rgb(10_7_4/0.8)_62%,rgb(10_7_4/0.86)_100%)]" />
      <div className="container-page relative grid gap-8 py-14 lg:h-[340px] lg:grid-cols-[1fr_690px] lg:items-center lg:py-0">
        <h2 id="pribehy-nadpis" data-reveal="" className="whitespace-pre-line font-display text-[28px] font-extrabold leading-[1.15] tracking-[-0.015em] text-white lg:-mt-16 lg:pl-12">{title}</h2>
        <ul className="grid gap-3.5 sm:grid-cols-3" aria-live="polite">
          {ordered.map((s, i) => (
            <li key={`${s.name}-${offset}`} className={`${i > 0 ? "hidden sm:block" : ""} story-in`} style={{ animationDelay: `${i * 110}ms` }}>
              <article className="group flex h-[176px] gap-3 rounded-[16px] border border-white/15 bg-black/35 p-2.5 text-white backdrop-blur-md transition duration-300 hover:-translate-y-1 hover:border-white/30 hover:bg-black/45">
                <span className="relative w-[43%] shrink-0 overflow-hidden rounded-[11px]">
                  <Image src={s.image} alt="" fill sizes="100px" className="object-cover transition duration-700 group-hover:scale-110" />
                </span>
                <span className="flex min-w-0 flex-col py-1 pr-1">
                  <span className="line-clamp-4 text-[12.5px] leading-[1.4] text-white/90">„{s.quote}“</span>
                  <Link href={href} aria-label={fmt(labels.play, { name: s.name })}
                    className="relative my-auto grid size-11 place-items-center self-center rounded-full border border-white/25 bg-white/15 transition hover:scale-110 hover:bg-white/25">
                    <span aria-hidden="true" className="ping-ring absolute inset-0 rounded-full border border-white/50" style={{ animationDelay: `${i * 500}ms` }} />
                    <PlayIcon size={17} className="relative translate-x-[1px]" />
                  </Link>
                  <span className="text-[13px] font-bold leading-tight">{s.name}</span>
                  <span className="text-[12px] text-white/70">{s.type}</span>
                </span>
              </article>
            </li>
          ))}
        </ul>
      </div>
      <button type="button" aria-label={labels.prev} onClick={() => setOffset((o) => (o - 1 + n) % n)} className={`${arrow} left-3 lg:left-10`}>
        <ChevronLeftIcon size={20} />
      </button>
      <button type="button" aria-label={labels.next} onClick={() => setOffset((o) => (o + 1) % n)} className={`${arrow} right-3 lg:right-10`}>
        <ChevronRightIcon size={20} />
      </button>
    </section>
  );
}
