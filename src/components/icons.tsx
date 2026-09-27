import type { ReactNode, SVGProps } from "react";

// Vlastní sada liniových ikon (24×24, tah 1.8) – bez externí knihovny, jednotný styl.
type IconProps = SVGProps<SVGSVGElement> & { size?: number };

function Svg({ size = 24, children, ...props }: IconProps & { children: ReactNode }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false" {...props}>
      {children}
    </svg>
  );
}

export const SearchIcon = (p: IconProps) => <Svg {...p}><circle cx="11" cy="11" r="7" /><path d="m20 20-3.6-3.6" /></Svg>;
export const UserIcon = (p: IconProps) => <Svg {...p}><circle cx="12" cy="8" r="4" /><path d="M4.5 20.5a7.5 7.5 0 0 1 15 0" /></Svg>;
export const HeartIcon = ({ filled, ...p }: IconProps & { filled?: boolean }) => (
  <Svg {...p} fill={filled ? "currentColor" : "none"}>
    <path d="M12 20.3s-7.4-4.5-9.1-9.1C1.7 7.8 3.9 4.6 7.3 4.6c2 0 3.4 1.1 4.7 2.8 1.3-1.7 2.7-2.8 4.7-2.8 3.4 0 5.6 3.2 4.4 6.6-1.7 4.6-9.1 9.1-9.1 9.1Z" />
  </Svg>
);
export const CartIcon = (p: IconProps) => (
  <Svg {...p}><circle cx="9.3" cy="19.6" r="1.3" /><circle cx="17.6" cy="19.6" r="1.3" /><path d="M2.6 3.6h2.5l2.4 11.1a1.6 1.6 0 0 0 1.6 1.3h8.4a1.6 1.6 0 0 0 1.6-1.2l1.6-7.2H6.1" /></Svg>
);
export const TruckIcon = (p: IconProps) => (
  <Svg {...p}><path d="M14 16.8V6.6a1 1 0 0 0-1-1H3.4a1 1 0 0 0-1 1v10.2h2" /><path d="M14 9h4.1l3.5 3.8v4h-2.1" /><path d="M9 16.8h6.4" /><circle cx="6.9" cy="17.1" r="2" /><circle cx="17.4" cy="17.1" r="2" /></Svg>
);
export const BoxIcon = (p: IconProps) => (
  <Svg {...p}><path d="M21 8.3 12 3.8 3 8.3v7.4l9 4.5 9-4.5Z" /><path d="m3 8.3 9 4.5 9-4.5" /><path d="M12 12.8v7.4" /><path d="m7.5 6 9 4.6" /></Svg>
);
export const ShieldCheckIcon = (p: IconProps) => (
  <Svg {...p}><path d="M12 21s7.5-3.1 7.5-9.4V5.8L12 3 4.5 5.8v5.8C4.5 17.9 12 21 12 21Z" /><path d="m8.8 12 2.3 2.3 4.3-4.5" /></Svg>
);
export const HeadsetIcon = (p: IconProps) => (
  <Svg {...p}><path d="M4 14v-2a8 8 0 0 1 16 0v2" /><rect x="3" y="13" width="4" height="6" rx="1.5" /><rect x="17" y="13" width="4" height="6" rx="1.5" /><path d="M19 19c0 1.6-1.8 2.5-4.5 2.5H13" /></Svg>
);
export const ArrowRightIcon = (p: IconProps) => <Svg {...p}><path d="M5 12h14" /><path d="m13 6 6 6-6 6" /></Svg>;
export const ChevronDownIcon = (p: IconProps) => <Svg {...p}><path d="m6 9 6 6 6-6" /></Svg>;
export const ChevronLeftIcon = (p: IconProps) => <Svg {...p}><path d="m15 18-6-6 6-6" /></Svg>;
export const ChevronRightIcon = (p: IconProps) => <Svg {...p}><path d="m9 18 6-6-6-6" /></Svg>;
export const MenuIcon = (p: IconProps) => <Svg {...p}><path d="M4 7h16M4 12h16M4 17h16" /></Svg>;
export const CloseIcon = (p: IconProps) => <Svg {...p}><path d="M6 6l12 12M18 6 6 18" /></Svg>;
export const CheckIcon = (p: IconProps) => <Svg {...p}><path d="m5 12.5 4.5 4.5L19 7.5" /></Svg>;
export const MailIcon = (p: IconProps) => <Svg {...p}><rect x="3" y="5" width="18" height="14" rx="2.5" /><path d="m4 7 8 6 8-6" /></Svg>;
export const HomeIcon = (p: IconProps) => <Svg {...p}><path d="M4 10.4 12 4l8 6.4V19a1 1 0 0 1-1 1h-4.5v-5.5h-5V20H5a1 1 0 0 1-1-1Z" /></Svg>;
export const PhoneIcon = (p: IconProps) => (
  <Svg {...p}><path d="M6.6 3.5h2.6l1.4 4.1-2 1.4a12 12 0 0 0 6.4 6.4l1.4-2 4.1 1.4v2.6a2 2 0 0 1-2.2 2A17 17 0 0 1 4.6 5.7a2 2 0 0 1 2-2.2Z" /></Svg>
);
export const GridIcon = (p: IconProps) => (
  <Svg {...p}><rect x="4" y="4" width="6.5" height="6.5" rx="1.5" /><rect x="13.5" y="4" width="6.5" height="6.5" rx="1.5" /><rect x="4" y="13.5" width="6.5" height="6.5" rx="1.5" /><rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.5" /></Svg>
);

export function StarIcon({ size = 16, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} aria-hidden="true" focusable="false">
      <path fill="currentColor" d="M12 2.6l2.9 5.9 6.5.9-4.7 4.6 1.1 6.4L12 17.4l-5.8 3 1.1-6.4-4.7-4.6 6.5-.9z" />
    </svg>
  );
}

export function VerifiedIcon({ size = 16, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} aria-hidden="true" focusable="false">
      <circle cx="12" cy="12" r="10" fill="currentColor" />
      <path d="m7.6 12.3 3 3 5.9-6.2" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
