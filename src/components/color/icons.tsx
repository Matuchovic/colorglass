// Ikony z návrhu COLOR (obrysové, 1.7 px, currentColor)
type P = { size?: number; className?: string };
const base = (size: number) => ({ width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.7, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, "aria-hidden": true });

export const FastTruckIcon = ({ size = 20, className }: P) => (
  <svg {...base(size)} className={className}><path d="M3 7h10v8H3zM13 10h4l3 3v2h-7" /><circle cx="7" cy="17" r="1.7" /><circle cx="17" cy="17" r="1.7" /><path d="M1 10h3M1.5 13H4" /></svg>
);
export const ShieldOkIcon = ({ size = 20, className }: P) => (
  <svg {...base(size)} className={className}><path d="M12 3 5 6v5c0 4.5 3 8 7 10 4-2 7-5.5 7-10V6z" /><path d="m9 12 2.2 2.2L15.5 10" /></svg>
);
export const TrialIcon = ({ size = 22, className }: P) => (
  <svg {...base(size)} className={className}><path d="M20 12a8 8 0 1 1-2.34-5.66" /><path d="M20 4v4h-4" /><path d="M9.2 10.2h2.4l-1.6 2c.9 0 1.7.6 1.7 1.5s-.8 1.6-1.8 1.6c-.6 0-1.1-.2-1.5-.6M14.6 10.2c1 0 1.6 1 1.6 2.6s-.6 2.6-1.6 2.6-1.6-1-1.6-2.6.6-2.6 1.6-2.6z" strokeWidth={1.4} /></svg>
);
export const VerifiedUsersIcon = ({ size = 20, className }: P) => (
  <svg {...base(size)} className={className}><path d="M12 2.8 14.3 4.5l2.8-.2.9 2.7 2.3 1.6-.9 2.7.9 2.7-2.3 1.6-.9 2.7-2.8-.2L12 19.8l-2.3-1.7-2.8.2-.9-2.7-2.3-1.6.9-2.7-.9-2.7 2.3-1.6.9-2.7 2.8.2z" /><circle cx="12" cy="9.6" r="2" /><path d="M8.7 14.8c.7-1.4 1.9-2.1 3.3-2.1s2.6.7 3.3 2.1" /></svg>
);
export const SupportIcon = ({ size = 22, className }: P) => (
  <svg {...base(size)} className={className}><path d="M4 13v-1a8 8 0 0 1 16 0v1" /><rect x="3" y="13" width="4" height="6" rx="1.6" /><rect x="17" y="13" width="4" height="6" rx="1.6" /><path d="M19 19c0 1.7-1.8 2.5-5 2.5" /></svg>
);
export const PlayIcon = ({ size = 16, className }: P) => (
  <svg width={size} height={size} viewBox="0 0 24 24" className={className} aria-hidden="true"><path d="M8 5.2v13.6a1 1 0 0 0 1.52.85l10.6-6.8a1 1 0 0 0 0-1.7L9.52 4.35A1 1 0 0 0 8 5.2z" fill="currentColor" /></svg>
);
export const CeIcon = ({ size = 28, className }: P) => (
  <svg width={size} height={size} viewBox="0 0 40 28" className={className} aria-hidden="true" fill="none" stroke="currentColor" strokeWidth={3.2}>
    <path d="M16 4.2a10 10 0 1 0 0 19.6" /><path d="M36 4.2a10 10 0 1 0 0 19.6M26.5 14H35" />
  </svg>
);
export const SafeBadgeIcon = ({ size = 26, className }: P) => (
  <svg {...base(size)} className={className}><path d="M12 2.5 14.4 4l2.8-.1 1 2.6 2.3 1.6-.8 2.7.8 2.7-2.3 1.6-1 2.6-2.8-.1L12 19.5 9.6 17.9l-2.8.1-1-2.6-2.3-1.6.8-2.7-.8-2.7 2.3-1.6 1-2.6 2.8.1z" /><path d="M9.3 11.2c.5-1.6 1.5-2.4 2.7-2.4 1.6 0 2.7 1.2 2.7 2.7 0 2-2.7 3.3-2.7 3.3s-1.3-.6-2.1-1.6" /><path d="M8.5 12.6c.9-.3 1.8 0 2.4.8" /></svg>
);
export const ArrowLongRight = ({ size = 18, className }: P) => (
  <svg {...base(size)} className={className} strokeWidth={2}><path d="M4 12h15M14 7l5 5-5 5" /></svg>
);

// Ikony menu a vyhledávání
export const GlassesIcon = ({ size = 18, className }: P) => (
  <svg {...base(size)} className={className}><circle cx="6.5" cy="14" r="3.5" /><circle cx="17.5" cy="14" r="3.5" /><path d="M10 14c1.2-1 2.8-1 4 0M3 14 4.5 7.5A2 2 0 0 1 6.4 6H7M21 14l-1.5-6.5A2 2 0 0 0 17.6 6H17" /></svg>
);
export const BulbIcon = ({ size = 18, className }: P) => (
  <svg {...base(size)} className={className}><path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.6 10.8c.6.5 1 1.2 1 2V16h5.2v-.2c0-.8.4-1.5 1-2A6 6 0 0 0 12 3z" /></svg>
);
export const EyeIcon = ({ size = 18, className }: P) => (
  <svg {...base(size)} className={className}><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z" /><circle cx="12" cy="12" r="3" /></svg>
);
export const StarLineIcon = ({ size = 18, className }: P) => (
  <svg {...base(size)} className={className}><path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1 6.2L12 17.3l-5.5 2.9 1-6.2L3 9.6l6.2-.9z" /></svg>
);
export const FilmIcon = ({ size = 18, className }: P) => (
  <svg {...base(size)} className={className}><rect x="3" y="4" width="18" height="16" rx="3" /><path d="m10 9 5 3-5 3z" /></svg>
);
export const HelpIcon = ({ size = 18, className }: P) => (
  <svg {...base(size)} className={className}><circle cx="12" cy="12" r="9" /><path d="M9.5 9.3a2.6 2.6 0 0 1 5 .9c0 1.8-2.5 2.2-2.5 3.8M12 17h.01" /></svg>
);
export const BookIcon = ({ size = 18, className }: P) => (
  <svg {...base(size)} className={className}><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5zM4 20.5A2.5 2.5 0 0 0 6.5 23H20v-5" /></svg>
);
export const MicIcon = ({ size = 18, className }: P) => (
  <svg {...base(size)} className={className}><rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21" /></svg>
);
export const ClockIcon = ({ size = 16, className }: P) => (
  <svg {...base(size)} className={className}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>
);
export const TrendIcon = ({ size = 16, className }: P) => (
  <svg {...base(size)} className={className}><path d="m3 17 6-6 4 4 8-8M15 7h6v6" /></svg>
);
export const PageIcon = ({ size = 18, className }: P) => (
  <svg {...base(size)} className={className}><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" /><path d="M14 3v5h5M9 13h6M9 17h4" /></svg>
);
export const HomeLineIcon = ({ size = 18, className }: P) => (
  <svg {...base(size)} className={className}><path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z" /></svg>
);
