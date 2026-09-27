import "server-only";
import { z } from "zod";

// Serverové proměnné se validují líně (až při použití), aby build neselhal bez tajných klíčů.
const serverSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(20),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(20),
  APP_SECRET: z.string().min(32, "APP_SECRET musí mít alespoň 32 znaků"),
});

let cached: z.infer<typeof serverSchema> | null = null;

export function serverEnv(): z.infer<typeof serverSchema> {
  if (cached) return cached;
  const parsed = serverSchema.safeParse(process.env);
  if (!parsed.success) {
    const fields = parsed.error.issues.map((i) => i.path.join(".")).join(", ");
    throw new Error(`Chybí nebo je neplatná konfigurace prostředí: ${fields}. Viz .env.example.`);
  }
  cached = parsed.data;
  return cached;
}

export function publicSupabaseEnv(): { url: string; anonKey: string } {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) throw new Error("Chybí NEXT_PUBLIC_SUPABASE_URL nebo NEXT_PUBLIC_SUPABASE_ANON_KEY. Viz .env.example.");
  return { url, anonKey };
}

export const isProduction = process.env.NODE_ENV === "production";
