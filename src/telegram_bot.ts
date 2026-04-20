/**
 * Telegram **long polling** — local dev when you have no HTTPS URL for webhooks.
 * Production / Knative (scale-to-zero): use **`src/server.ts`** with `WEBHOOK_URL` + POST
 * `TELEGRAM_WEBHOOK_PATH` (see README).
 *
 * Requires BOT_TOKEN and DATABASE_URL (default file:./data/app.db).
 */
import { Bot } from "grammy";
import { createDrawResultFetcher } from "./adapters/ingestion/create_draw_result_fetcher.ts";
import { createPersistenceBundle } from "./adapters/persistence/drizzle/persistence_factory.ts";
import { loadConfig } from "./config/env.ts";
import { configureLogger, getLogger } from "./logging/mod.ts";
import { initObservability } from "./observability/mod.ts";
import { parseSupportedGameId } from "./domain/mod.ts";
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
const gameId = parseSupportedGameId(config.GAME_ID);

if (!token) {
  log.error("telegram_bot.missing_token", { hint: "Set BOT_TOKEN in environment or .env" });
  Deno.exit(1);
}

await Deno.mkdir("data", { recursive: true });
const { users, lines, draws } = await createPersistenceBundle(config.DATABASE_URL);

const bot = new Bot(token);
const fetcher = createDrawResultFetcher({
  gameId,
  otoslottoUrl: config.OTOSLOTTO_RESULT_JSON_URL,
  eurojackpotUrl: config.EUROJACKPOT_RESULT_JSON_URL,
});
registerTelegramHandlers(bot, {
  users,
  lines,
  draws,
  fetcher,
  gameId,
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
