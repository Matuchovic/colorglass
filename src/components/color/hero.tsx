import Image from "next/image";
import Link from "next/link";
import type { CSSProperties } from "react";
import { BeforeAfter } from "./before-after";
import { ParallaxScene } from "./parallax-scene";
import { ArrowLongRight, FastTruckIcon, ShieldOkIcon, SupportIcon, TrialIcon } from "./icons";
import { fmt, type Dictionary } from "@/i18n";
import { storePath, type StoreCode } from "@/lib/store";

const GREY_DOTS = ["#8f9297", "#4a4c51", "#1f86f5", "#f6c10f", "#ee2a3c"];
const COLOR_DOTS = ["#2db34a", "#8a7b20", "#1f86f5", "#f6c10f", "#ee2a3c"];
const GLASSES = "/images/products/color-pro-outdoor.webp";
// Barevné světelné koule v barevné části fotky (jemný „živý“ efekt)
const ORBS = [
  { l: "55%", t: "10%", s: 260, c: "#ff4d8d", d: 17, dl: -3 },
  { l: "72%", t: "48%", s: 320, c: "#22d3ee", d: 21, dl: -8 },
  { l: "44%", t: "62%", s: 220, c: "#a3e635", d: 19, dl: -5 },
  { l: "86%", t: "4%", s: 210, c: "#f59e0b", d: 23, dl: -11 },
  { l: "6%", t: "22%", s: 240, c: "#8b5cf6", d: 20, dl: -6 },
];
const SPARKS = [
  { l: "24%", t: "33%", s: 22, d: 0 },
  { l: "61%", t: "36%", s: 16, d: 1.2 },
  { l: "79%", t: "57%", s: 20, d: 2.3 },
];
const delay = (ms: number): CSSProperties => ({ animationDelay: `${ms}ms` });

function Dots({ colors }: { colors: string[] }) {
  return (
    <span className="absolute bottom-1.5 left-1/2 flex -translate-x-1/2 gap-1 rounded-full bg-white/95 px-1.5 py-1 shadow-sm">
      {colors.map((c) => <span key={c} className="size-3.5 rounded-full ring-1 ring-black/5" style={{ backgroundColor: c }} />)}
    </span>
  );
}

function Spark({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" className="drop-shadow-[0_0_6px_rgb(255_255_255/0.95)]">
      <path d="M12 0l2.2 9.8L24 12l-9.8 2.2L12 24l-2.2-9.8L0 12l9.8-2.2z" fill="#fff" />
    </svg>
  );
}

export function Hero({ store, t, freeShipping }: { store: StoreCode; t: Dictionary; freeShipping: string }) {
  const h = t.color.hero;
  const icons = [<TrialIcon key="a" size={30} />, <FastTruckIcon key="b" size={30} />, <ShieldOkIcon key="c" size={28} />, <SupportIcon key="d" size={28} />];
  return (
    <ParallaxScene className="relative lg:-mt-[52px]">
      <div className="relative isolate h-[600px] overflow-hidden bg-[#0d0f14] sm:h-[620px] lg:h-[650px]">
        <BeforeAfter before="/images/color/hero-grey.webp" after="/images/color/hero-color.webp" alt={h.imageAlt}
          labels={{ without: h.without, with: h.with, slider: h.slider }} initial={51} />
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-[1] bg-[linear-gradient(90deg,rgb(6_8_12/0.88)_0%,rgb(6_8_12/0.72)_24%,rgb(6_8_12/0.28)_42%,transparent_56%)]" />
        <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 z-[1] h-40 bg-gradient-to-t from-black/60 to-transparent" />
        <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 z-[1] hidden h-20 bg-gradient-to-b from-white/35 to-transparent lg:block" />
        <div aria-hidden="true" className="parallax-soft pointer-events-none absolute inset-0 z-[2] mix-blend-screen">
          {ORBS.map((o) => (
            <span key={o.c} className="orb absolute rounded-full opacity-[0.2] blur-3xl"
              style={{ left: o.l, top: o.t, width: o.s, height: o.s, background: o.c, animationDuration: `${o.d}s`, animationDelay: `${o.dl}s` }} />
          ))}
        </div>

        {/* Text nechává myš projít na fotku (posuvník lze chytit kdekoli), klikací jsou jen odkazy */}
        <div className="container-page pointer-events-none relative z-10 flex h-full flex-col justify-end pb-14 lg:justify-start lg:pb-0 lg:pl-[78px] lg:pt-[152px] [&_a]:pointer-events-auto">
          <div className="parallax-soft">
            <p className="hero-in text-[12px] font-semibold uppercase tracking-[0.32em] text-white/85" style={delay(120)}>{h.eyebrow}</p>
            <h1 className="mt-3 font-display font-extrabold uppercase leading-[0.98] tracking-[-0.01em] text-white">
              <span className="hero-in block text-[40px] sm:text-[46px] lg:text-[49px]" style={delay(260)}>{h.title}</span>
              <span className="barev-in mt-1 inline-block text-[74px] leading-[1.02] tracking-[0.015em] sm:text-[88px] lg:text-[96px]" style={delay(420)}>
                <span className="text-rainbow-soft inline-block">{h.highlight}</span>
              </span>
            </h1>
            <p className="hero-in mt-4 max-w-[480px] whitespace-pre-line text-[16px] leading-[1.5] text-white/90 lg:text-[17px]" style={delay(620)}>{h.text}</p>
            <div className="hero-in mt-7 flex flex-wrap gap-4" style={delay(780)}>
              <Link href={storePath(store, "/colortest")} className="btn-hero inline-flex h-[50px] items-center gap-3 rounded-[12px] px-7 text-[15px] font-semibold text-white">
                {h.primary}<ArrowLongRight size={18} />
              </Link>
              <Link href={storePath(store, "/kategorie/bryle")} className="inline-flex h-[50px] items-center rounded-[12px] px-6 text-[15px] font-semibold text-white ring-[1.5px] ring-white/85 backdrop-blur-sm transition hover:-translate-y-0.5 hover:bg-white/15">
                {h.secondary}
              </Link>
            </div>
            <ul className="mt-8 hidden flex-wrap items-center gap-y-3 text-white sm:flex">
              {h.trust.map((item, i) => (
                <li key={item.a} className="hero-in flex items-center" style={delay(940 + i * 110)}>
                  {i > 0 && <span aria-hidden="true" className="mx-5 h-9 w-px bg-white/25" />}
                  <span className="flex items-center gap-3">
                    <span className="text-white/90">{icons[i]}</span>
                    <span className="text-[13px] leading-[1.3]">
                      <span className={`block ${item.bold.includes("a") ? "font-bold" : "text-white/85"}`}>{item.a}</span>
                      <span className={`block ${item.bold.includes("b") ? "font-bold" : "text-white/85"}`}>{fmt(item.b, { amount: freeShipping })}</span>
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="parallax-mid pointer-events-none absolute right-[34px] top-[104px] z-10 hidden w-[212px] lg:block">
          <div className="hero-in" style={delay(1000)}>
            <figure className="float-y rounded-[18px] bg-white/80 p-3 shadow-[0_0_0_1.5px_rgb(255_255_255/0.7),0_0_26px_2px_rgb(90_150_255/0.55),0_0_46px_-6px_rgb(236_72_255/0.45)] backdrop-blur-md">
              <figcaption className="border-l-2 border-ink-200 pl-2.5 font-display text-[14.5px] font-bold leading-[1.22] text-ink-950">{h.cardTitle}</figcaption>
              <div className="relative mt-3 aspect-[16/10.4] overflow-hidden rounded-[11px]">
                <Image src="/images/color/card-grey.webp" alt={h.cardGreyAlt} fill sizes="190px" className="object-cover" />
                <Dots colors={GREY_DOTS} />
              </div>
              <div className="relative mt-2.5 aspect-[16/10.4] overflow-hidden rounded-[11px]">
                <Image src="/images/color/card-color.webp" alt={h.cardColorAlt} fill sizes="190px" className="kenburns object-cover" />
                <Dots colors={COLOR_DOTS} />
              </div>
            </figure>
          </div>
        </div>
      </div>

      {/* Brýle s duhovým odleskem, leskem a jiskrami – přesahují do další sekce (dle návrhu) */}
      <div aria-hidden="true" className="parallax-strong pointer-events-none absolute -bottom-[62px] right-[-6px] z-30 hidden w-[500px] lg:block">
        <div className="glasses-in" style={delay(650)}>
          <div className="float-rot relative">
            <span className="streak absolute left-[-150px] top-[60%] h-7 w-[430px] -rotate-[16deg] rounded-full bg-[linear-gradient(90deg,transparent,#ff3d6e_16%,#ffb020_30%,#ffe95a_42%,#35e08a_54%,#22d3ee_66%,#3b82f6_78%,#a855f7)] opacity-90 blur-[9px]" />
            <span className="streak absolute left-[-110px] top-[66%] h-2 w-[360px] -rotate-[16deg] rounded-full bg-[linear-gradient(90deg,transparent,#fff_40%,#bfe3ff)] opacity-80 blur-[3px]" style={delay(900)} />
            <div className="relative -rotate-[7deg]">
              <Image src={GLASSES} alt="" width={1200} height={900} sizes="500px" draggable={false} className="relative drop-shadow-[0_24px_30px_rgb(0_0_0/0.35)]" />
              <span className="glasses-shine absolute inset-0" style={{ WebkitMaskImage: `url(${GLASSES})`, maskImage: `url(${GLASSES})` }} />
              {SPARKS.map((s) => (
                <span key={s.l} className="twinkle absolute" style={{ left: s.l, top: s.t, animationDelay: `${s.d}s` }}><Spark size={s.s} /></span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </ParallaxScene>
  );
}
