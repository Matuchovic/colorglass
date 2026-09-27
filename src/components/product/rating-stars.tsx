import { StarIcon } from "@/components/icons";

/** Hvězdičky s přesným dílčím vyplněním (např. 4.6 = 92 %). */
export function RatingStars({ value, size = 16, label }: { value: number; size?: number; label: string }) {
  const pct = Math.max(0, Math.min(100, (value / 5) * 100));
  const row = (cls: string) => (
    <span className={`flex ${cls}`}>
      {Array.from({ length: 5 }, (_, i) => <StarIcon key={i} size={size} />)}
    </span>
  );
  return (
    <span className="relative inline-flex shrink-0" role="img" aria-label={label}>
      {row("text-ink-200")}
      <span className="absolute inset-y-0 left-0 overflow-hidden" style={{ width: `${pct}%` }}>
        {row("text-star")}
      </span>
    </span>
  );
}
