import Image from "next/image";
import Link from "next/link";
import { ArrowLongRight, CeIcon, SafeBadgeIcon } from "./icons";
import type { Dictionary } from "@/i18n";
import { storePath, type StoreCode } from "@/lib/store";

function Callout({ text, className, up }: { text: string; className: string; up?: boolean }) {
  return (
    <span className={`absolute hidden items-start gap-2 text-[13px] font-semibold leading-[1.25] text-white lg:flex ${className}`}>
      <span className={`relative mt-[5px] size-[7px] shrink-0 rounded-full bg-white shadow-[0_0_8px_2px_rgb(255_255_255/0.6)] ${up ? "" : ""}`}>
        <span className={`absolute left-1/2 w-px -translate-x-1/2 bg-white/60 ${up ? "bottom-full h-[42px]" : "top-full h-[40px]"}`} />
      </span>
      <span className="whitespace-pre-line">{text}</span>
    </span>
  );
}

export function TechBanner({ store, t }: { store: StoreCode; t: Dictionary }) {
  const c = t.color.tech;
  return (
    <div className="relative isolate overflow-hidden rounded-[22px] bg-tech px-6 py-9 sm:px-10 lg:h-[300px] lg:px-[50px] lg:py-0">
      <div aria-hidden="true" className="absolute inset-y-0 left-[24%] right-[9%] -z-10 hidden lg:block">
        <Image src="/images/color/lens.webp" alt="" fill sizes="(min-width: 1024px) 940px, 100vw" className="object-cover object-[48%_52%] [mask-image:linear-gradient(90deg,transparent_0%,#000_16%,#000_84%,transparent_100%)]" />
      </div>
      <div aria-hidden="true" className="absolute inset-0 -z-10 lg:hidden">
        <Image src="/images/color/lens.webp" alt="" fill sizes="100vw" className="object-cover opacity-40" />
      </div>
      <div className="relative flex h-full max-w-[350px] flex-col justify-center">
        <h2 className="whitespace-pre-line font-display text-[30px] font-extrabold leading-[1.1] tracking-[-0.015em] text-white">{c.title}</h2>
        <p className="mt-3 text-[15px] leading-[1.5] text-white/80">{c.text}</p>
        <Link href={storePath(store, "/jak-to-funguje")} className="glow-frame mt-7 inline-flex h-[50px] w-fit items-center gap-3 rounded-[12px] bg-[#0d1426] px-7 text-[15px] font-semibold text-white transition hover:bg-[#141c33]">
          {c.cta}<ArrowLongRight size={18} />
        </Link>
      </div>
      <Callout text={c.uv} className="left-[57%] top-[22px] flex-row" />
      <Callout text={c.layers} className="left-[50%] bottom-[26px]" up />
      <Callout text={c.contrast} className="left-[66.5%] bottom-[26px]" up />
      <dl className="mt-8 grid grid-cols-3 gap-4 rounded-[16px] border border-white/10 bg-white/[0.03] p-5 text-white backdrop-blur-sm lg:absolute lg:inset-y-[22px] lg:right-[22px] lg:mt-0 lg:flex lg:w-[176px] lg:flex-col lg:justify-center lg:gap-[18px]">
        <div><dt className="font-display text-[34px] font-extrabold leading-none">10+</dt><dd className="mt-1.5 text-[12.5px] leading-snug text-white/75">{c.years}</dd></div>
        <div><dt><CeIcon size={34} /></dt><dd className="mt-1.5 text-[12.5px] leading-snug text-white/75">{c.certified}</dd></div>
        <div><dt><SafeBadgeIcon size={30} /></dt><dd className="mt-1.5 whitespace-pre-line text-[12.5px] leading-snug text-white/75">{c.safe}</dd></div>
      </dl>
    </div>
  );
}
