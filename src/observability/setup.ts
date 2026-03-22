import { metrics, trace } from "@opentelemetry/api";
import { OTLPMetricExporter } from "@opentelemetry/exporter-metrics-otlp-http";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { Resource } from "@opentelemetry/resources";
import { ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION } from "@opentelemetry/semantic-conventions";
import { MeterProvider, PeriodicExportingMetricReader } from "@opentelemetry/sdk-metrics";
import { BasicTracerProvider, BatchSpanProcessor } from "@opentelemetry/sdk-trace-base";
import { ensureInstrumentsRegistered } from "./instruments.ts";
import { installOtelContextManager } from "./otel_context.ts";

export type ObservabilityConfig = {
  serviceName: string;
  serviceVersion: string;
  /** Base URL, e.g. `http://localhost:4318` — traces → `/v1/traces`, metrics → `/v1/metrics`. */
  otlpBaseUrl?: string;
};

let tracerProvider: BasicTracerProvider | null = null;
let meterProvider: MeterProvider | null = null;

function normalizeOtlpBase(url: string): string {
  return url.replace(/\/$/, "");
}

/**
 * Registers global tracer and meter providers with OTLP/HTTP export when `otlpBaseUrl` is set.
 * When unset, OpenTelemetry API remains default no-op (no network, minimal overhead).
 */
export function initObservability(config: ObservabilityConfig): void {
  installOtelContextManager();
  if (!config.otlpBaseUrl) {
    ensureInstrumentsRegistered();
    return;
  }

  const base = normalizeOtlpBase(config.otlpBaseUrl);
  const resource = new Resource({
    [ATTR_SERVICE_NAME]: config.serviceName,
    [ATTR_SERVICE_VERSION]: config.serviceVersion,
  });

  const traceExporter = new OTLPTraceExporter({ url: `${base}/v1/traces` });
  tracerProvider = new BasicTracerProvider({ resource });
  tracerProvider.addSpanProcessor(new BatchSpanProcessor(traceExporter));
  trace.setGlobalTracerProvider(tracerProvider);

  const metricExporter = new OTLPMetricExporter({ url: `${base}/v1/metrics` });
  const metricReader = new PeriodicExportingMetricReader({
    exporter: metricExporter,
    exportIntervalMillis: 60_000,
  });
  meterProvider = new MeterProvider({ resource, readers: [metricReader] });
  metrics.setGlobalMeterProvider(meterProvider);

  ensureInstrumentsRegistered();
}

/** Flush and shutdown exporters (call on process exit / SIGTERM). */
export async function shutdownObservability(): Promise<void> {
  await tracerProvider?.shutdown();
  await meterProvider?.shutdown();
  tracerProvider = null;
  meterProvider = null;
}
