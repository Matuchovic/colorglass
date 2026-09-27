import Link from "next/link";
import { cn } from "@/lib/utils";

/**
 * Logo COLOR: Montserrat Black s prostrkáním, „O“ jako duhový prstenec, pod ním claim.
 * Velikost se řídí font-size (className např. text-[46px]); vše uvnitř je v em.
 */
export function Logo({ href, label, variant = "color", className, tagline, preload: _preload }: {
  href: string;
  label: string;
  variant?: "color" | "white";
  className?: string;
  tagline?: string;
  preload?: boolean;
}) {
  const white = variant === "white";
  return (
    <Link href={href} aria-label={label} className={cn("inline-flex shrink-0 flex-col items-stretch leading-none", className ?? "text-[40px]")}>
      <span className={cn("flex items-center font-display font-black tracking-[0.12em]", white ? "text-white" : "text-ink-950")} aria-hidden="true">
        C
        <span className="ring-rainbow mx-[0.035em] inline-block size-[0.8em] rounded-full [mask:radial-gradient(circle_closest-side,transparent_50%,#000_53%)]" />
        L
        <span className="ring-rainbow mx-[0.035em] inline-block size-[0.8em] rounded-full [mask:radial-gradient(circle_closest-side,transparent_50%,#000_53%)] [transform:rotate(140deg)]" />
        R
      </span>
      {tagline && (
        <span className={cn("mt-[0.24em] pl-[1.28em] text-[0.215em] font-semibold uppercase tracking-[0.36em]", white ? "text-white/70" : "text-ink-600")}>
          {tagline}
        </span>
      )}
    </Link>
  );
}
