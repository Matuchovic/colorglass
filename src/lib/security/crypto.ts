import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";

export function sha256Hex(input: string): string {
  return createHash("sha256").update(input, "utf8").digest("hex");
}

export function hmacSha256Hex(secret: string, payload: string): string {
  return createHmac("sha256", secret).update(payload, "utf8").digest("hex");
}

/** Kryptograficky bezpečný token (base64url). 32 bajtů = 256 bitů entropie. */
export function randomToken(bytes = 32): string {
  return randomBytes(bytes).toString("base64url");
}

/** Porovnání v konstantním čase (ochrana proti timing útokům). */
export function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a, "utf8");
  const bb = Buffer.from(b, "utf8");
  if (ba.length !== bb.length) return false;
  return timingSafeEqual(ba, bb);
}

/** Přístupový token k objednávce odvozený z idempotency klíče (nikde se neukládá v čitelné podobě). */
export function orderAccessToken(secret: string, idempotencyKey: string): string {
  return Buffer.from(hmacSha256Hex(secret, `order-access:${idempotencyKey}`), "hex").toString("base64url");
}
