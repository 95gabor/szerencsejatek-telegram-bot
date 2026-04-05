import { trace } from "@opentelemetry/api";
import { Bot, webhookCallback } from "grammy";
import { cloudEventFromHttpRequest } from "./adapters/http/cloudevents_request.ts";
import { NoopOutboundNotifier } from "./adapters/notify/noop_notifier.ts";
import { TelegramOutboundNotifier } from "./adapters/notify/telegram_notifier.ts";
import { BetHuOtoslottoFetcher } from "./adapters/ingestion/bet_hu_otoslotto_fetcher.ts";
import { createAppDatabase } from "./adapters/persistence/drizzle/client.ts";
import { DrizzleDrawRecordRepository } from "./adapters/persistence/drizzle/draw_record_repository.ts";
import { DrizzlePlayedLineRepository } from "./adapters/persistence/drizzle/played_line_repository.ts";
import { DrizzleUserRepository } from "./adapters/persistence/drizzle/user_repository.ts";
import { ensureSchema } from "./adapters/persistence/drizzle/ensure_schema.ts";
import { createPipelineEmitter, dispatchPipelineEvent } from "./application/dispatch.ts";
import { loadConfig } from "./config/env.ts";
import { configureLogger, getLogger } from "./logging/mod.ts";
import {
  httpDurationMs,
  httpRequests,
  initObservability,
  shutdownObservability,
} from "./observability/mod.ts";
import type { OutboundNotifier } from "./ports/outbound_notifier.ts";
import { registerTelegramHandlers } from "./telegram/register_handlers.ts";

const config = loadConfig();

configureLogger({ format: config.LOG_FORMAT, level: config.LOG_LEVEL });
const log = getLogger();

initObservability({
  serviceName: config.OTEL_SERVICE_NAME,
  serviceVersion: config.OTEL_SERVICE_VERSION,
  otlpBaseUrl: config.OTEL_EXPORTER_OTLP_ENDPOINT,
});

const databaseUrl = config.DATABASE_URL;
const gameId = config.GAME_ID;
const port = config.PORT;
const botToken = config.BOT_TOKEN;
const webhookBaseUrl = config.WEBHOOK_URL;
const telegramBackgroundInit = config.TELEGRAM_BACKGROUND_INIT;
const webhookPath = config.TELEGRAM_WEBHOOK_PATH;
const webhookSecret = config.TELEGRAM_WEBHOOK_SECRET;
const locale = config.DEFAULT_LOCALE;
const TELEGRAM_INIT_RETRY_DELAYS_MS = [1000, 2000, 5000, 10000, 30000];

await Deno.mkdir("data", { recursive: true });
await ensureSchema(databaseUrl);
const db = createAppDatabase(databaseUrl);
const draws = new DrizzleDrawRecordRepository(db);
const lines = new DrizzlePlayedLineRepository(db);
const fetcher = new BetHuOtoslottoFetcher({ url: config.OTOSLOTTO_RESULT_JSON_URL });

const notifierState: { delegate: OutboundNotifier | null } = {
  delegate: botToken ? null : new NoopOutboundNotifier(),
};
const notifier: OutboundNotifier = {
  async sendUserMessage(input) {
    if (!notifierState.delegate) {
      throw new Error("telegram_notifier_not_ready");
    }
    await notifierState.delegate.sendUserMessage(input);
  },
};
let handleTelegram: ((request: Request) => Promise<Response>) | null = null;
const telegramRuntimeState = {
  ready: !botToken,
  initAttempts: 0,
  lastError: null as string | null,
};

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function initializeTelegramRuntime(): Promise<void> {
  if (!botToken) {
    return;
  }
  const users = new DrizzleUserRepository(db);
  const bot = new Bot(botToken);
  registerTelegramHandlers(bot, { users, lines, draws, gameId, locale });
  bot.catch((err) => {
    log.error("telegram.bot.error", {
      error: err instanceof Error ? err.message : String(err),
    });
  });
  const telegramNotifier = new TelegramOutboundNotifier(bot);
  const telegramWebhookHandler = webhookCallback(bot, "std/http", {
    secretToken: webhookSecret,
  });
  await bot.init();
  if (webhookBaseUrl) {
    const webhookFullUrl = `${webhookBaseUrl}${webhookPath}`;
    await bot.api.setWebhook(
      webhookFullUrl,
      webhookSecret ? { secret_token: webhookSecret } : {},
    );
    log.info("telegram.webhook.set", { url: webhookFullUrl });
  } else {
    log.warn("telegram.webhook.missing_url", {
      hint: "Set WEBHOOK_URL for auto setWebhook, or register manually",
    });
  }
  notifierState.delegate = telegramNotifier;
  handleTelegram = telegramWebhookHandler;
  telegramRuntimeState.ready = true;
  telegramRuntimeState.lastError = null;
  log.info("telegram.runtime.ready", { background_init: telegramBackgroundInit });
}

if (botToken) {
  if (telegramBackgroundInit) {
    log.info("telegram.runtime.init_started", {
      background_init: true,
      retry_delays_ms: TELEGRAM_INIT_RETRY_DELAYS_MS,
    });
    void (async () => {
      for (;;) {
        telegramRuntimeState.initAttempts += 1;
        try {
          await initializeTelegramRuntime();
          return;
        } catch (error) {
          telegramRuntimeState.ready = false;
          telegramRuntimeState.lastError = error instanceof Error ? error.message : String(error);
          const retryDelayMs =
            TELEGRAM_INIT_RETRY_DELAYS_MS[
              Math.min(telegramRuntimeState.initAttempts - 1, TELEGRAM_INIT_RETRY_DELAYS_MS.length - 1)
            ];
          log.error("telegram.runtime.init_failed", {
            attempt: telegramRuntimeState.initAttempts,
            error: telegramRuntimeState.lastError,
            retry_in_ms: retryDelayMs,
            hint: "Set TELEGRAM_BACKGROUND_INIT=false to fail fast on startup.",
          });
          await sleep(retryDelayMs);
        }
      }
    })();
  } else {
    telegramRuntimeState.initAttempts = 1;
    await initializeTelegramRuntime();
  }
}

const emit = createPipelineEmitter({
  fetcher,
  draws,
  lines,
  notifier,
  gameId,
  locale,
});

const pipelineDeps = {
  emit,
  fetcher,
  draws,
  lines,
  notifier,
  gameId,
  locale,
};

const httpTracer = trace.getTracer("http.server");

function httpRouteLabel(url: URL, method: string): string {
  if (method === "GET" && url.pathname === "/") {
    return "GET /";
  }
  if (method === "GET" && url.pathname === "/healthz") {
    return "GET /healthz";
  }
  if (method === "POST" && url.pathname === webhookPath) {
    return "POST /telegram/webhook";
  }
  if (method === "POST") {
    return "POST /cloudevents";
  }
  return `${method} ${url.pathname}`;
}

Deno.serve({ port }, async (request) => {
  const url = new URL(request.url);
  const route = httpRouteLabel(url, request.method);
  const t0 = performance.now();

  return await httpTracer.startActiveSpan("http.server", async (span) => {
    span.setAttribute("http.method", request.method);
    span.setAttribute("http.route", route);

    let status = 500; // default if handler throws before assignment
    try {
      if (request.method === "GET" && url.pathname === "/") {
        status = 200;
        return new Response("ok", { status });
      }
      if (request.method === "GET" && url.pathname === "/healthz") {
        if (botToken && telegramBackgroundInit && !telegramRuntimeState.ready) {
          status = 503;
          return new Response("telegram runtime is still initializing", { status });
        }
        status = 200;
        return new Response("ok", { status });
      }

      if (request.method === "POST" && url.pathname === webhookPath) {
        if (!botToken) {
          status = 404;
          return new Response("telegram webhook disabled", { status });
        }
        if (!handleTelegram) {
          status = 503;
          return new Response("telegram webhook not ready", { status });
        }
        const telegramResponse = await handleTelegram(request);
        status = telegramResponse.status;
        return telegramResponse;
      }

      if (request.method !== "POST") {
        status = 405;
        return new Response("method not allowed", { status });
      }

      let event;
      try {
        event = await cloudEventFromHttpRequest(request);
      } catch {
        status = 400;
        return new Response("invalid cloudevent", { status: 400 });
      }

      try {
        await dispatchPipelineEvent(event, pipelineDeps);
      } catch (error) {
        log.error("http.cloudevents.dispatch_failed", {
          error: error instanceof Error ? error.message : String(error),
        });
        span.recordException(error as Error);
        status = 500;
        return new Response("internal error", { status: 500 });
      }

      status = 204;
      return new Response(null, { status: 204 });
    } catch (err) {
      log.error("http.handler.unhandled", {
        error: err instanceof Error ? err.message : String(err),
      });
      span.recordException(err as Error);
      throw err;
    } finally {
      span.setAttribute("http.status_code", status);
      const ms = performance.now() - t0;
      const attrs = {
        "http.method": request.method,
        "http.route": route,
        "http.status_code": status,
      };
      httpDurationMs.record(ms, attrs);
      httpRequests.add(1, attrs);
      log.info("http.handler", {
        http_method: request.method,
        http_route: route,
        http_status_code: status,
        duration_ms: Math.round(ms * 1000) / 1000,
      });
    }
  });
});

log.info("server.started", { port });

const shutdown = () => {
  shutdownObservability()
    .then(() => Deno.exit(0))
    .catch((e) => {
      log.error("shutdown.observability_failed", {
        error: e instanceof Error ? e.message : String(e),
      });
      Deno.exit(1);
    });
};
try {
  Deno.addSignalListener("SIGINT", shutdown);
  Deno.addSignalListener("SIGTERM", shutdown);
} catch {
  // ignore on hosts without signal support
}
