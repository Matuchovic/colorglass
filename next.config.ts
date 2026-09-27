import type { NextConfig } from "next";

const isProd = process.env.NODE_ENV === "production";
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseOrigin = supabaseUrl ? new URL(supabaseUrl).origin : "";
const analyticsEnabled = Boolean(process.env.NEXT_PUBLIC_GA4_ID);

const csp = [
  "default-src 'self'",
  // 'unsafe-inline' je nutné pro inline bootstrap Next.js u staticky generovaných (ISR) stránek; nonce by vynutil dynamické renderování.
  `script-src 'self' 'unsafe-inline'${isProd ? "" : " 'unsafe-eval'"} https://widget.packeta.com${analyticsEnabled ? " https://www.googletagmanager.com" : ""}`,
  "style-src 'self' 'unsafe-inline' https://widget.packeta.com",
  `img-src 'self' data: blob: ${supabaseOrigin} https://widget.packeta.com https://*.packeta.com${analyticsEnabled ? " https://www.google-analytics.com https://www.googletagmanager.com" : ""}`,
  "font-src 'self'",
  `connect-src 'self' ${supabaseOrigin} https://*.packeta.com${analyticsEnabled ? " https://*.google-analytics.com https://*.analytics.google.com https://www.googletagmanager.com" : ""}`,
  "frame-src https://widget.packeta.com https://www.youtube-nocookie.com https://player.vimeo.com",
  "frame-ancestors 'none'",
  "form-action 'self' https://payments.comgate.cz https://gate.gopay.cz https://gw.sandbox.gopay.com https://checkout.stripe.com",
  "base-uri 'self'",
  "object-src 'none'",
  ...(isProd ? ["upgrade-insecure-requests"] : []),
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin-allow-popups" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(self \"https://widget.packeta.com\"), payment=(self), browsing-topics=()" },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  images: {
    formats: ["image/avif", "image/webp"],
    qualities: [60, 75, 85],
    minimumCacheTTL: 60 * 60 * 24 * 30,
    remotePatterns: [
      { protocol: "https", hostname: "*.supabase.co", pathname: "/storage/v1/object/public/**" },
      ...(supabaseUrl && !supabaseUrl.includes("supabase.co")
        ? [{ protocol: new URL(supabaseUrl).protocol.replace(":", "") as "http" | "https", hostname: new URL(supabaseUrl).hostname, port: new URL(supabaseUrl).port, pathname: "/storage/v1/object/public/**" }]
        : []),
    ],
  },
  experimental: {
    serverActions: { bodySizeLimit: "6mb" },
  },
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      { source: "/brand/:path*", headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }] },
      { source: "/images/:path*", headers: [{ key: "Cache-Control", value: "public, max-age=2592000, stale-while-revalidate=86400" }] },
    ];
  },
};

export default nextConfig;
