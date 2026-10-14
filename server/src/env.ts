/**
 * Carga y validación de variables de entorno.
 * Centraliza el acceso a process.env y falla rápido si falta algo crítico.
 */
import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  PORT: z.coerce.number().int().positive().default(3000),
  DATABASE_URL: z.string().min(1, "DATABASE_URL es obligatoria"),
  JWT_SECRET: z
    .string()
    .min(16, "JWT_SECRET debe tener al menos 16 caracteres"),
  SESSION_TTL: z.string().default("8h"),
  COOKIE_NAME: z.string().default("task_sac_session"),
  COOKIE_SECURE: z
    .string()
    .optional()
    .transform((v) => v === "true"),
  CORS_ORIGINS: z.string().optional().default(""),
  TZ: z.string().default("America/Bogota"),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("❌ Variables de entorno inválidas:");
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;

export const corsOrigins = env.CORS_ORIGINS.split(",")
  .map((s) => s.trim())
  .filter(Boolean);

export const isProd = env.NODE_ENV === "production";
export const isTest = env.NODE_ENV === "test";
