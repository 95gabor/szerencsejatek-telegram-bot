import { loadSync } from "@std/dotenv";
import { z } from "zod";
import { DEFAULT_OTOSLOTTO_RESULT_JSON_URL } from "../adapters/ingestion/bet_hu_otoslotto_fetcher.ts";
import { DEFAULT_TELEGRAM_WEBHOOK_PATH } from "../telegram/webhook_path.ts";

const emptyToUndefined = (v: unknown) => v === "" || v === undefined ? undefined : v;
const parseBooleanEnv = (v: unknown): unknown => {
  if (v === undefined || v === "") {
    return undefined;
  }
  if (typeof v === "boolean") {
    return v;
  }
  if (typeof v === "string") {
    const normalized = v.trim().toLowerCase();
    if (["1", "true", "yes", "on"].includes(normalized)) {
      return true;
    }
    if (["0", "false", "no", "off"].includes(normalized)) {
      return false;
    }
  }
  return v;
};

const envSchema = z.object({
  PORT: z.coerce.number().int().min(1).max(65535).default(8080),
  DATABASE_URL: z.string().min(1).default("file:./data/app.db"),
  GAME_ID: z.string().min(1).default("otoslotto"),
  BOT_TOKEN: z.preprocess(emptyToUndefined, z.string().min(1).optional()),
  WEBHOOK_URL: z.preprocess(
    emptyToUndefined,
    z.string().url().optional(),
  ),
  CRON_RESULT_CHECK_ENABLED: z.preprocess(parseBooleanEnv, z.boolean().default(false)),
  TELEGRAM_BACKGROUND_INIT: z.preprocess(parseBooleanEnv, z.boolean().default(false)),
  TELEGRAM_WEBHOOK_PATH: z.string().min(1).startsWith("/").default(DEFAULT_TELEGRAM_WEBHOOK_PATH),
  TELEGRAM_WEBHOOK_SECRET: z.preprocess(emptyToUndefined, z.string().min(1).optional()),
  DEFAULT_LOCALE: z.enum(["hu"]).default("hu"),
  OTEL_SERVICE_NAME: z.string().min(1).default("szerencsejatek-telegram-bot"),
  OTEL_SERVICE_VERSION: z.string().min(1).default("0.0.0"),
  OTEL_EXPORTER_OTLP_ENDPOINT: z.preprocess(
    emptyToUndefined,
    z.string().url().optional(),
  ),
  LOG_FORMAT: z.enum(["json", "text"]).default("text"),
  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),
  /** Ötöslottó JSON feed (operator public API). Empty env uses default bet.szerencsejatek.hu URL. */
  OTOSLOTTO_RESULT_JSON_URL: z.preprocess(
    (v) => (v === "" || v === undefined ? DEFAULT_OTOSLOTTO_RESULT_JSON_URL : v),
    z.string().url(),
  ),
});

export type AppConfig = z.infer<typeof envSchema>;

function readRawEnv(): Record<string, string | undefined> {
  return {
    PORT: Deno.env.get("PORT"),
    DATABASE_URL: Deno.env.get("DATABASE_URL"),
    GAME_ID: Deno.env.get("GAME_ID"),
    BOT_TOKEN: Deno.env.get("BOT_TOKEN"),
    WEBHOOK_URL: Deno.env.get("WEBHOOK_URL"),
    CRON_RESULT_CHECK_ENABLED: Deno.env.get("CRON_RESULT_CHECK_ENABLED"),
    TELEGRAM_BACKGROUND_INIT: Deno.env.get("TELEGRAM_BACKGROUND_INIT"),
    TELEGRAM_WEBHOOK_PATH: Deno.env.get("TELEGRAM_WEBHOOK_PATH"),
    TELEGRAM_WEBHOOK_SECRET: Deno.env.get("TELEGRAM_WEBHOOK_SECRET"),
    DEFAULT_LOCALE: Deno.env.get("DEFAULT_LOCALE"),
    OTEL_SERVICE_NAME: Deno.env.get("OTEL_SERVICE_NAME"),
    OTEL_SERVICE_VERSION: Deno.env.get("OTEL_SERVICE_VERSION"),
    OTEL_EXPORTER_OTLP_ENDPOINT: Deno.env.get("OTEL_EXPORTER_OTLP_ENDPOINT"),
    LOG_FORMAT: Deno.env.get("LOG_FORMAT"),
    LOG_LEVEL: Deno.env.get("LOG_LEVEL"),
    OTOSLOTTO_RESULT_JSON_URL: Deno.env.get("OTOSLOTTO_RESULT_JSON_URL"),
  };
}

/**
 * Validates process env; exits the process on failure (startup only).
 * Loads `./.env` into `Deno.env` when present (does not override existing env vars).
 */
export function loadConfig(): AppConfig {
  loadSync({ export: true });
  const result = envSchema.safeParse(readRawEnv());
  if (!result.success) {
    console.error("Invalid configuration:", result.error.flatten());
    Deno.exit(1);
  }
  const data = result.data;
  return {
    ...data,
    WEBHOOK_URL: data.WEBHOOK_URL?.replace(/\/$/, ""),
    OTEL_EXPORTER_OTLP_ENDPOINT: data.OTEL_EXPORTER_OTLP_ENDPOINT?.replace(/\/$/, ""),
  };
}
