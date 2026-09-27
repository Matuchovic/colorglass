import "server-only";
import { logger } from "@/lib/logger";

export interface EmailMessage {
  to: string;
  subject: string;
  html: string;
  text: string;
  idempotencyKey?: string;
}

/** Odeslání přes Resend REST API. Bez RESEND_API_KEY se e-mail jen zaloguje (lokální vývoj). */
export async function sendEmail(message: EmailMessage): Promise<{ id: string | null }> {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM ?? "COLOR <objednavky@color.cz>";
  if (!key) {
    logger.info("email.dev_log", { to: message.to, subject: message.subject });
    return { id: null };
  }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      authorization: `Bearer ${key}`,
      "content-type": "application/json",
      ...(message.idempotencyKey ? { "idempotency-key": message.idempotencyKey.slice(0, 256) } : {}),
    },
    body: JSON.stringify({
      from,
      to: [message.to],
      subject: message.subject,
      html: message.html,
      text: message.text,
      ...(process.env.EMAIL_REPLY_TO ? { reply_to: process.env.EMAIL_REPLY_TO } : {}),
    }),
    cache: "no-store",
    signal: AbortSignal.timeout(15_000),
  });
  const body = (await res.json().catch(() => ({}))) as { id?: string; message?: string };
  if (!res.ok) throw new Error(`Resend ${res.status}: ${body.message ?? "neznámá chyba"}`);
  return { id: body.id ?? null };
}
