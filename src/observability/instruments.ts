import type { Counter, Histogram } from "@opentelemetry/api";
import { metrics } from "@opentelemetry/api";

const SCOPE = "dev.szerencsejatek.telegram";
const VERSION = "1.0.0";

let httpRequestsCounter: Counter | undefined;
let httpDurationHistogram: Histogram | undefined;
let pipelineEventsCounter: Counter | undefined;
let telegramCommandsCounter: Counter | undefined;

/** Call after `initObservability` (or lazily — uses noop meter until provider is set). */
export function ensureInstrumentsRegistered(): void {
  if (httpRequestsCounter) return;
  const meter = metrics.getMeter(SCOPE, VERSION);
  httpRequestsCounter = meter.createCounter("http.server.requests", {
    description: "Inbound HTTP requests handled by Deno.serve",
  });
  httpDurationHistogram = meter.createHistogram("http.server.duration_ms", {
    description: "Inbound HTTP request duration in milliseconds",
    unit: "ms",
  });
  pipelineEventsCounter = meter.createCounter("pipeline.events", {
    description: "CloudEvents processed by dispatchPipelineEvent",
  });
  telegramCommandsCounter = meter.createCounter("telegram.commands", {
    description: "Telegram bot commands handled",
  });
}

function getHttpRequestsCounter(): Counter {
  ensureInstrumentsRegistered();
  return httpRequestsCounter!;
}

function getHttpDurationHistogram(): Histogram {
  ensureInstrumentsRegistered();
  return httpDurationHistogram!;
}

function getPipelineEventsCounter(): Counter {
  ensureInstrumentsRegistered();
  return pipelineEventsCounter!;
}

function getTelegramCommandsCounter(): Counter {
  ensureInstrumentsRegistered();
  return telegramCommandsCounter!;
}

export const httpRequests = {
  add: (value: number, attributes?: Record<string, string | number | boolean>) =>
    getHttpRequestsCounter().add(value, attributes),
};

export const httpDurationMs = {
  record: (value: number, attributes?: Record<string, string | number | boolean>) =>
    getHttpDurationHistogram().record(value, attributes),
};

export const pipelineEvents = {
  add: (value: number, attributes?: Record<string, string | number | boolean>) =>
    getPipelineEventsCounter().add(value, attributes),
};

export const telegramCommands = {
  add: (value: number, attributes?: Record<string, string | number | boolean>) =>
    getTelegramCommandsCounter().add(value, attributes),
};
