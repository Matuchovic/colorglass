import localFont from "next/font/local";

// Plus Jakarta Sans (OFL) – variabilní řez 200–800, podmnožina latin + latin-ext (česká i slovenská diakritika).
// Self-hosting: žádné požadavky na Google Fonts (GDPR), automatické metriky fallbacku proti CLS.
export const jakarta = localFont({
  src: "./fonts/PlusJakartaSans-Variable.woff2",
  variable: "--font-jakarta",
  weight: "200 800",
  display: "swap",
});

// Caveat (OFL) – pouze pro ručně psanou poznámku v hero banneru (dle návrhu), bez preloadu.
export const caveat = localFont({
  src: "./fonts/Caveat-SemiBold.woff2",
  variable: "--font-caveat",
  weight: "600",
  display: "swap",
  preload: false,
});

// Montserrat (OFL) – variabilní 100–900, latin + latin-ext. Nadpisy, logo a ceny podle návrhu COLOR.
export const montserrat = localFont({
  src: "./fonts/Montserrat-Variable.woff2",
  variable: "--font-montserrat",
  weight: "100 900",
  display: "swap",
});
