// Strukturované logy (JSON) s redakcí citlivých polí. Hesla, tokeny, platební a tajné údaje se nikdy nelogují.
const SENSITIVE = /pass(word)?|token|secret|authorization|cookie|api[-_]?key|card|cvc|iban|signature|service[-_]?role/i;

function redact(value: unknown, depth = 0): unknown {
  if (depth > 4) return "[…]";
  if (value instanceof Error) return { name: value.name, message: value.message, code: (value as { code?: unknown }).code };
  if (Array.isArray(value)) return value.slice(0, 20).map((v) => redact(v, depth + 1));
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) out[k] = SENSITIVE.test(k) ? "[redacted]" : redact(v, depth + 1);
    return out;
  }
  if (typeof value === "string") return value.length > 500 ? `${value.slice(0, 500)}…` : value;
  return value;
}

type Level = "info" | "warn" | "error";

function write(level: Level, event: string, context?: Record<string, unknown>) {
  const line = JSON.stringify({ level, event, time: new Date().toISOString(), ...(context ? (redact(context) as object) : {}) });
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.info(line);
  if (level === "error" && typeof window === "undefined" && process.env.ERROR_WEBHOOK_URL) {
    void fetch(process.env.ERROR_WEBHOOK_URL, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ text: `COLOR ${event}`, event, context: redact(context) }),
      signal: AbortSignal.timeout(3000),
    }).catch(() => undefined);
  }
}

export const logger = {
  info: (event: string, context?: Record<string, unknown>) => write("info", event, context),
  warn: (event: string, context?: Record<string, unknown>) => write("warn", event, context),
  error: (event: string, context?: Record<string, unknown>) => write("error", event, context),
};
