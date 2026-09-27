import "server-only";
import { headers } from "next/headers";
import { hmacSha256Hex } from "./crypto";
import { serverEnv } from "@/lib/env";

/** IP klienta za proxy Vercelu. */
export function clientIpFrom(h: Headers): string {
  return h.get("x-real-ip") ?? h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "0.0.0.0";
}

/** IP se nikdy neukládá v čitelné podobě – jen solený hash (minimalizace osobních údajů). */
export function hashIp(ip: string): string {
  return hmacSha256Hex(serverEnv().APP_SECRET, `ip:${ip}`);
}

export async function requestIpHash(): Promise<string> {
  const h = await headers();
  return hashIp(clientIpFrom(h));
}

export async function requestUserAgent(): Promise<string> {
  return ((await headers()).get("user-agent") ?? "").slice(0, 300);
}

/** Kontrola původu pro Route Handlery měnící stav (Server Actions to dělají samy). */
export function isSameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}
