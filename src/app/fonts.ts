import localFont from "next/font/local";

// Caveat (OFL) – pouze pro ručně psanou poznámku v hero banneru (dle návrhu), bez preloadu.
export const caveat = localFont({
  src: "./fonts/Caveat-SemiBold.woff2",
  variable: "--font-caveat",
  weight: "600",
  display: "swap",
  preload: false,
});

// Montserrat (OFL) – variabilní 100–900, latin + latin-ext. Jediné písmo webu COLOR (texty, nadpisy, logo, ceny).
export const montserrat = localFont({
  src: "./fonts/Montserrat-Variable.woff2",
  variable: "--font-montserrat",
  weight: "100 900",
  display: "swap",
});
