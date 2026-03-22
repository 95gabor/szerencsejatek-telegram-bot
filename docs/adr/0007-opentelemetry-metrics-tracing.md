# ADR 0007: OpenTelemetry metrics and tracing (OTLP/HTTP)

## Status

Accepted

## Context

Operators need **metrics** (request rates, latency, pipeline throughput) and **distributed tracing**
to debug production behaviour. **NFR-3** in `docs/requirements.md` calls for observability hooks. We
want a vendor-neutral path that works with **Grafana**, **Jaeger**, **Prometheus** (via collector),
and managed OTLP endpoints.

## Alternatives considered

| Option                                            | Summary                                                                                                  |
| ------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| **Ad hoc `console.log` + Prometheus client only** | Simple; **no** unified model with traces; two instrumentation styles.                                    |
| **Vendor SDKs** (Datadog, New Relic, …)           | Rich UX; **lock-in** and extra agents not ideal for a small Deno service.                                |
| **OpenTelemetry** (OTLP exporters)                | **Standard** semantic conventions; **one** API for metrics + traces; export to any OTLP-capable backend. |

## Decision

1. Use **`@opentelemetry/api`** with **`@opentelemetry/sdk-trace-base`** and
   **`@opentelemetry/sdk-metrics`**.
2. When **`OTEL_EXPORTER_OTLP_ENDPOINT`** is set (base URL, no trailing slash), register global
   tracer and meter providers and export to **`/v1/traces`** and **`/v1/metrics`** over HTTP (OTLP).
3. When unset, providers stay **default no-op** — **no** network; counters/histograms use the noop
   meter (minimal overhead).
4. Instrument:
   - **HTTP** (`src/server.ts`): span `http.server`, histogram `http.server.duration_ms`, counter
     `http.server.requests` (labels `http.method`, `http.route`, `http.status_code`).
   - **Pipeline** (`dispatchPipelineEvent`): span `pipeline.dispatch`, counter `pipeline.events`
     (`event.type`).
   - **Telegram** (`register_handlers`): span `telegram.update`, counter `telegram.commands`
     (`command`).
5. **`installOtelContextManager`** (`AsyncLocalStorageContextManager`) runs at the start of
   **`initObservability`** so active trace context propagates (required for Deno/Node; enables
   **`trace_id` / `span_id`** on structured logs in `src/logging/`).
6. **`initObservability`** / **`shutdownObservability`** in `src/observability/setup.ts`; **`SIGINT`
   / `SIGTERM`** flush providers on shutdown.

## Dependencies

Pinned in `deno.json` imports:

| Package                                         | Version  | Role                                               |
| ----------------------------------------------- | -------- | -------------------------------------------------- |
| `npm:@opentelemetry/api`                        | `1.9.0`  | Trace/metrics API                                  |
| `npm:@opentelemetry/context-async-hooks`        | `1.28.0` | `AsyncLocalStorageContextManager` (active context) |
| `npm:@opentelemetry/sdk-trace-base`             | `1.28.0` | `BasicTracerProvider`, `BatchSpanProcessor`        |
| `npm:@opentelemetry/sdk-metrics`                | `1.28.0` | `MeterProvider`, `PeriodicExportingMetricReader`   |
| `npm:@opentelemetry/resources`                  | `1.28.0` | `Resource` (service name/version)                  |
| `npm:@opentelemetry/exporter-trace-otlp-http`   | `0.57.2` | OTLP trace HTTP                                    |
| `npm:@opentelemetry/exporter-metrics-otlp-http` | `0.57.2` | OTLP metrics HTTP                                  |
| `npm:@opentelemetry/semantic-conventions`       | `1.28.0` | `ATTR_SERVICE_*`                                   |

## Review

| Field       | Value                                                                |
| ----------- | -------------------------------------------------------------------- |
| Approved by | (reviewer name or handle — after explicit approval of this ADR text) |
| Approved at | `YYYY-MM-DDTHH:mm:ssZ` (UTC — when approval was given)               |

## Consequences

- **Positive**: Single stack for metrics and traces; works with OpenTelemetry Collector sidecar or
  hosted OTLP.
- **Negative**: Larger `deno.lock`; exporters need **`--allow-net`** to collector (already on
  server).
- **Follow-up**: Optional **sampling** (`OTEL_TRACES_SAMPLER`).
