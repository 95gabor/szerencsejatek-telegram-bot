/**
 * Telegram **long polling** — local dev when you have no HTTPS URL for webhooks.
 * Production / Knative (scale-to-zero): use **`src/server.ts`** with `WEBHOOK_URL` + POST
 * `TELEGRAM_WEBHOOK_PATH` (see README).
 *
 * Requires BOT_TOKEN and DATABASE_URL (default file:./data/app.db).
 */
import { Bot } from "grammy";
import { createAppDatabase } from "./adapters/persistence/drizzle/client.ts";
import { DrizzleDrawRecordRepository } from "./adapters/persistence/drizzle/draw_record_repository.ts";
import { DrizzlePlayedLineRepository } from "./adapters/persistence/drizzle/played_line_repository.ts";
import { DrizzleUserRepository } from "./adapters/persistence/drizzle/user_repository.ts";
import { ensureSchema } from "./adapters/persistence/drizzle/ensure_schema.ts";
import { loadConfig } from "./config/env.ts";
import { configureLogger, getLogger } from "./logging/mod.ts";
import { initObservability } from "./observability/mod.ts";
import { registerTelegramHandlers } from "./telegram/register_handlers.ts";

const config = loadConfig();
configureLogger({ format: config.LOG_FORMAT, level: config.LOG_LEVEL });
const log = getLogger();
initObservability({
  serviceName: config.OTEL_SERVICE_NAME,
  serviceVersion: config.OTEL_SERVICE_VERSION,
  otlpBaseUrl: config.OTEL_EXPORTER_OTLP_ENDPOINT,
});
const token = config.BOT_TOKEN;

if (!token) {
  log.error("telegram_bot.missing_token", { hint: "Set BOT_TOKEN in environment or .env" });
  Deno.exit(1);
}

await Deno.mkdir("data", { recursive: true });
await ensureSchema(config.DATABASE_URL);
const db = createAppDatabase(config.DATABASE_URL);
const users = new DrizzleUserRepository(db);
const lines = new DrizzlePlayedLineRepository(db);
const draws = new DrizzleDrawRecordRepository(db);

const bot = new Bot(token);
registerTelegramHandlers(bot, {
  users,
  lines,
  draws,
  gameId: config.GAME_ID,
  locale: config.DEFAULT_LOCALE,
});

bot.catch((err) => {
  log.error("telegram.bot.error", {
    error: err instanceof Error ? err.message : String(err),
  });
});

await bot.api.deleteWebhook({ drop_pending_updates: false });
log.info("telegram_bot.starting", { mode: "long_polling" });
await bot.start();
