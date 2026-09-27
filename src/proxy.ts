import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

// Směrování obchodů: CZ na kořeni (/…), SK pod /sk/… nebo na vlastní doméně (NEXT_PUBLIC_SITE_URL_SK).
// Interně se vše obsluhuje přes app/[store]/… (cz | sk).
const SK_ENABLED = process.env.NEXT_PUBLIC_ENABLE_SK !== "false";
const SK_HOST = process.env.NEXT_PUBLIC_SITE_URL_SK ? new URL(process.env.NEXT_PUBLIC_SITE_URL_SK).host : null;

// Stránky pracující s relací: tady se obnovuje přihlášení (Supabase SSR), jinde zůstává web statický
const SESSION_PATHS = /^\/(?:sk\/)?(?:muj-ucet|prihlaseni|registrace|nove-heslo|pokladna|kosik|objednavka)(?:\/|$)/;
type CookieToSet = { name: string; value: string; options?: Record<string, unknown> };

async function refreshSession(request: NextRequest): Promise<{ cookieHeader: string | null; toSet: CookieToSet[] }> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const toSet: CookieToSet[] = [];
  if (!url || !key) return { cookieHeader: null, toSet };
  const jar = new Map(request.cookies.getAll().map((c) => [c.name, c.value]));
  const supabase = createServerClient(url, key, {
    cookies: {
      getAll: () => [...jar].map(([name, value]) => ({ name, value })),
      setAll: (list) => {
        for (const c of list) {
          jar.set(c.name, c.value);
          toSet.push(c);
        }
      },
    },
  });
  await supabase.auth.getUser();
  if (!toSet.length) return { cookieHeader: null, toSet };
  return { cookieHeader: [...jar].filter(([, v]) => v).map(([n, v]) => `${n}=${v}`).join("; "), toSet };
}

function withStoreHeader(request: NextRequest, store: "cz" | "sk", cookieHeader: string | null = null) {
  const headers = new Headers(request.headers);
  headers.set("x-color-store", store);
  if (cookieHeader !== null) headers.set("cookie", cookieHeader);
  return headers;
}

function applyCookies(response: NextResponse, toSet: CookieToSet[]) {
  for (const c of toSet) {
    response.cookies.set(c.name, c.value, { ...c.options, httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/" });
  }
  return response;
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const session = SESSION_PATHS.test(pathname) ? await refreshSession(request) : { cookieHeader: null, toSet: [] };
  const onSkDomain = SK_ENABLED && SK_HOST !== null && request.headers.get("host") === SK_HOST;

  // /cz/… není veřejná adresa → kanonická URL bez prefixu
  if (pathname === "/cz" || pathname.startsWith("/cz/")) {
    const url = request.nextUrl.clone();
    url.pathname = pathname.slice(3) || "/";
    return NextResponse.redirect(url, 308);
  }

  if (pathname === "/sk" || pathname.startsWith("/sk/")) {
    if (!SK_ENABLED || onSkDomain) {
      const url = request.nextUrl.clone();
      url.pathname = pathname.slice(3) || "/";
      return NextResponse.redirect(url, 308);
    }
    return applyCookies(NextResponse.next({ request: { headers: withStoreHeader(request, "sk", session.cookieHeader) } }), session.toSet);
  }

  const store = onSkDomain ? "sk" : "cz";
  const url = request.nextUrl.clone();
  url.pathname = `/${store}${pathname === "/" ? "" : pathname}`;
  return applyCookies(NextResponse.rewrite(url, { request: { headers: withStoreHeader(request, store, session.cookieHeader) } }), session.toSet);
}

export const config = {
  matcher: [
    "/((?!api/|admin(?:/|$)|auth/|_next/|brand/|images/|.*\\.(?:png|jpe?g|webp|avif|gif|svg|ico|txt|xml|woff2?|js|css|map|json|webmanifest)$).*)",
  ],
};
