import { context, trace } from "@opentelemetry/api";

export type LogLevel = "debug" | "info" | "warn" | "error";

export type LogFormat = "json" | "text";

export type LoggerConfig = {
  format: LogFormat;
  level: LogLevel;
  /** Override output (e.g. tests); default writes to stdout. */
  sink?: (line: string) => void;
};

const levelRank: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

function enabled(level: LogLevel, min: LogLevel): boolean {
  return levelRank[level] >= levelRank[min];
}

function isoTimestamp(): string {
  return new Date().toISOString();
}

/** W3C trace id (32 hex) and span id (16 hex) from the active OTel span, when valid. */
function activeTraceLogFields(): Record<string, string> {
  const span = trace.getSpan(context.active());
  if (!span) return {};
  const sc = span.spanContext();
  if (!trace.isSpanContextValid(sc)) return {};
  return {
    trace_id: sc.traceId,
    span_id: sc.spanId,
  };
}

function writeLine(line: string): void {
  // deno-lint-ignore no-console
  console.log(line);
}

function formatText(
  level: LogLevel,
  msg: string,
  fields: Record<string, unknown>,
): string {
  const parts = [isoTimestamp(), level.toUpperCase(), msg];
  for (const [k, v] of Object.entries(fields)) {
    if (v === undefined) continue;
    const s = typeof v === "string" ? v : JSON.stringify(v);
    parts.push(`${k}=${s}`);
  }
  return parts.join(" ");
}

function formatJson(
  level: LogLevel,
  msg: string,
  fields: Record<string, unknown>,
): string {
  const payload: Record<string, unknown> = {
    ts: isoTimestamp(),
    level,
    msg,
    ...fields,
  };
  return JSON.stringify(payload);
}

export type Logger = {
  debug: (msg: string, fields?: Record<string, unknown>) => void;
  info: (msg: string, fields?: Record<string, unknown>) => void;
  warn: (msg: string, fields?: Record<string, unknown>) => void;
  error: (msg: string, fields?: Record<string, unknown>) => void;
};

export function createLogger(config: LoggerConfig): Logger {
  const emit = (level: LogLevel, msg: string, fields: Record<string, unknown>) => {
    if (!enabled(level, config.level)) return;
    const merged = { ...fields, ...activeTraceLogFields() };
    const line = config.format === "json"
      ? formatJson(level, msg, merged)
      : formatText(level, msg, merged);
    (config.sink ?? writeLine)(line);
  };

  return {
    debug: (msg, fields) => emit("debug", msg, fields ?? {}),
    info: (msg, fields) => emit("info", msg, fields ?? {}),
    warn: (msg, fields) => emit("warn", msg, fields ?? {}),
    error: (msg, fields) => emit("error", msg, fields ?? {}),
  };
}

let root: Logger | null = null;

/** Call once at process startup after `loadConfig()` (or tests). */
export function configureLogger(config: LoggerConfig): void {
  root = createLogger(config);
}

/** Root logger; defaults to text + info if `configureLogger` was not called. */
export function getLogger(): Logger {
  if (!root) {
    root = createLogger({ format: "text", level: "info" });
  }
  return root;
}
