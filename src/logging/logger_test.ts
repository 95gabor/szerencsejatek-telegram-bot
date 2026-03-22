import { trace } from "@opentelemetry/api";
import { BasicTracerProvider } from "@opentelemetry/sdk-trace-base";
import { assertEquals } from "jsr:@std/assert@1/equals";
import { installOtelContextManager } from "../observability/otel_context.ts";
import { createLogger } from "./logger.ts";

Deno.test("createLogger json format emits parseable JSON with msg and fields", () => {
  const lines: string[] = [];
  const logger = createLogger({
    format: "json",
    level: "info",
    sink: (line) => lines.push(line),
  });
  logger.info("test.msg", { foo: "bar" });
  const row = JSON.parse(lines[0] ?? "{}") as Record<string, unknown>;
  assertEquals(row.msg, "test.msg");
  assertEquals(row.level, "info");
  assertEquals(row.foo, "bar");
  assertEquals(typeof row.ts, "string");
});

Deno.test("createLogger respects level (info skips debug)", () => {
  const lines: string[] = [];
  const logger = createLogger({
    format: "text",
    level: "info",
    sink: (line) => lines.push(line),
  });
  logger.debug("skip");
  logger.warn("keep");
  assertEquals(lines.length, 1);
  assertEquals(lines[0]?.includes("keep"), true);
});

Deno.test("createLogger adds trace_id and span_id from active OpenTelemetry span", async () => {
  installOtelContextManager();
  const prev = trace.getTracerProvider();
  const provider = new BasicTracerProvider();
  trace.setGlobalTracerProvider(provider);
  const lines: string[] = [];
  try {
    const logger = createLogger({
      format: "json",
      level: "info",
      sink: (line) => lines.push(line),
    });
    // Sync callback keeps active context for logger.info (async callbacks can lose context).
    trace.getTracer("logger-test").startActiveSpan("test-span", (span) => {
      logger.info("inside.span");
      span.end();
    });
    const row = JSON.parse(lines[0] ?? "{}") as Record<string, unknown>;
    assertEquals(row.msg, "inside.span");
    assertEquals(typeof row.trace_id, "string");
    assertEquals((row.trace_id as string).length, 32);
    assertEquals(typeof row.span_id, "string");
    assertEquals((row.span_id as string).length, 16);
  } finally {
    trace.setGlobalTracerProvider(prev);
    await provider.shutdown();
  }
});
