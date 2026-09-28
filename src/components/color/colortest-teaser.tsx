import Image from "next/image";
import Link from "next/link";
import type { CSSProperties } from "react";
import { ArrowLongRight, PlayIcon } from "./icons";
import type { Dictionary } from "@/i18n";
import { storePath, type StoreCode } from "@/lib/store";

const TYPE_STYLE = [
  { bg: "bg-[#ece3ff]", fg: "text-[#8b5cf6]", glyph: "◉", dot: "#8b5cf6" },
  { bg: "bg-[#ffe6b3]", fg: "text-[#f59e0b]", glyph: "✕", dot: "#f59e0b" },
  { bg: "bg-[#d6f3ff]", fg: "text-[#0ea5e9]", glyph: "✕", dot: "#0ea5e9" },
];
const PATHS = ["M0 103 C 40 103, 50 34, 100 34", "M0 103 C 50 103, 60 103, 100 103", "M0 103 C 40 103, 50 172, 100 172"];

export function ColorTestTeaser({ store, t }: { store: StoreCode; t: Dictionary }) {
  const c = t.color.test;
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_392px] lg:items-center lg:gap-8">
      <div data-reveal="" className="relative overflow-hidden rounded-[22px] border border-[#e3e9f6] bg-[#f1f5fe] px-6 py-7 sm:px-9 lg:h-[206px] lg:py-0">
        <div className="relative z-10 flex flex-col justify-center lg:h-full lg:max-w-[330px]">
          <h2 className="whitespace-pre-line font-display text-[25px] font-extrabold leading-[1.1] tracking-[-0.015em] text-ink-950">{c.title}</h2>
          <p className="mt-2.5 whitespace-pre-line text-[14px] leading-[1.45] text-ink-700">{c.text}</p>
          <Link href={storePath(store, "/colortest")} className="group mt-4 inline-flex h-[42px] w-fit items-center gap-3 rounded-[10px] bg-brand-600 px-6 text-[14px] font-semibold text-white shadow-[0_8px_20px_-8px_rgb(12_96_254/0.9)] transition hover:-translate-y-0.5 hover:bg-brand-700 hover:shadow-[0_14px_28px_-10px_rgb(12_96_254/0.95)]">
            {c.cta}<ArrowLongRight size={17} className="transition-transform group-hover:translate-x-1" />
          </Link>
        </div>
        <div aria-hidden="true" className="pointer-events-none absolute inset-y-0 left-[33%] hidden w-[46%] overflow-hidden [mask-image:radial-gradient(ellipse_62%_78%_at_42%_50%,#000_45%,transparent_100%)] lg:block">
          <Image src="/images/color/eye.webp" alt="" fill sizes="440px" className="breathe object-cover object-[30%_48%]" />
          <span className="beam-sweep absolute inset-y-0 left-0 w-1/3 bg-[linear-gradient(90deg,transparent,rgb(255_255_255/0.5),transparent)] mix-blend-overlay" />
        </div>
        <svg aria-hidden="true" className="pointer-events-none absolute inset-y-0 left-[60%] hidden h-full w-[10%] lg:block" viewBox="0 0 100 206" preserveAspectRatio="none" fill="none">
          {PATHS.map((d, i) => (
            <g key={d}>
              <path d={d} stroke="rgb(120 140 200 / 0.5)" strokeWidth="1" vectorEffect="non-scaling-stroke" className="dash-flow" />
              <circle r="2.6" fill={TYPE_STYLE[i]!.dot}>
                <animateMotion dur={`${2.2 + i * 0.4}s`} repeatCount="indefinite" path={d} />
              </circle>
            </g>
          ))}
        </svg>
        <ul className="relative z-10 mt-6 grid gap-4 sm:grid-cols-3 lg:absolute lg:right-[3%] lg:top-1/2 lg:mt-0 lg:w-[27%] lg:-translate-y-1/2 lg:grid-cols-1 lg:gap-[22px]">
          {c.types.map((type, i) => (
            <li key={type.code} className="flex items-start gap-3">
              <span className="relative mt-0.5 grid size-[26px] shrink-0 place-items-center" aria-hidden="true">
                <span className={`${TYPE_STYLE[i]!.bg} ping-ring absolute inset-0 rounded-full`} style={{ animationDelay: `${i * 700}ms` }} />
                <span className={`${TYPE_STYLE[i]!.bg} ${TYPE_STYLE[i]!.fg} relative grid size-[26px] place-items-center rounded-full text-[12px] font-bold`}>{TYPE_STYLE[i]!.glyph}</span>
              </span>
              <span className="leading-tight">
                <span className="block text-[13px] font-bold uppercase text-ink-900">{type.code}</span>
                <span className="mt-0.5 block text-[12.5px] text-ink-500">{type.text}</span>
              </span>
            </li>
          ))}
        </ul>
      </div>

      <div className="relative flex items-center gap-5 lg:h-[206px] lg:pt-10">
        <p aria-hidden="true" data-reveal="write" style={{ "--rd": "300ms" } as CSSProperties}
          className="absolute right-0 top-0 hidden -rotate-[7deg] whitespace-pre-line text-right font-hand text-[25px] leading-[1.05] text-ink-900 lg:block">
          {c.note}
        </p>
        <svg aria-hidden="true" data-reveal="" className="absolute right-[22px] top-[62px] hidden text-ink-800 lg:block" width="34" height="52" viewBox="0 0 34 52" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
          <path className="draw-path" d="M28 2c3 14-2 30-18 44" /><path className="draw-path" d="M9 36l1 10 10-3" />
        </svg>
        <Link href={storePath(store, "/pribehy")} data-reveal="zoom" className="group relative h-[106px] w-[154px] shrink-0 overflow-hidden rounded-[14px] shadow-[0_10px_24px_-12px_rgb(10_20_50/0.45)]">
          <Image src="/images/color/reactions.webp" alt={c.videoAlt} fill sizes="154px" className="object-cover transition duration-700 group-hover:scale-110" />
        </Link>
        <Link href={storePath(store, "/pribehy")} className="group flex items-center gap-3.5 text-[15px] font-medium leading-snug text-ink-900 hover:text-brand-700">
          <span className="relative grid size-[42px] shrink-0 place-items-center rounded-full bg-white text-brand-600 shadow-sm ring-[1.5px] ring-brand-200 transition group-hover:scale-110">
            <span aria-hidden="true" className="ping-ring absolute inset-0 rounded-full ring-2 ring-brand-300" />
            <PlayIcon size={17} className="relative translate-x-[1px]" />
          </span>
          <span className="whitespace-pre-line">{c.video}</span>
        </Link>
      </div>
    </div>
  );
}
