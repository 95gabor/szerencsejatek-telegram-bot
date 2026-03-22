# ADR 0003: Inbound HTTP CloudEvents and Knative

## Status

Accepted

## Context

Events may arrive over **HTTP** (e.g. **Knative Eventing** Trigger → subscriber). We need a single
entry that parses **structured** and **binary** CloudEvents reliably.

## Alternatives considered

| Option                                 | Summary                                                                                                                                                                                            |
| -------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Hand-rolled HTTP parsing**           | Implement CloudEvents **structured/binary** modes manually — **no extra npm dep**, but **easy to get wrong** (headers, charset, batching); official SDK preferred for correctness and maintenance. |
| **Plain JSON `POST` (no CloudEvents)** | Fixed JSON body and content-type — **simplest** client; **breaks** Knative Eventing / Broker delivery assumptions and loses a **standard** envelope for tracing and versioning.                    |
| **Another HTTP stack**                 | e.g. **Oak / Hono** on Deno — fine for routing; still need **CloudEvents parsing** somewhere; `Deno.serve` is enough for a single endpoint and keeps dependencies small.                           |
| **Hosting: plain Kubernetes**          | **Deployment + Service** only — simpler mental model; **no** scale-to-zero or Knative routing; we document **Knative** for **Serving** (revisions, probes) and optional **Eventing** (Triggers).   |
| **Hosting: PaaS / serverless**         | e.g. **Deno Deploy**, **Cloud Run** — valid alternatives; **different** config and event ingress; this repo’s **kind + Knative** path targets **CNCF-style** local and cluster workflows.          |

## Decision

- Implement **`src/server.ts`** with `Deno.serve`: `POST /` accepts CloudEvents; `GET /` and
  `GET /healthz` return **200** for probes.
- Parse requests with the official **`cloudevents`** npm package (`HTTP.toEvent`), then map to the
  internal `CloudEvent` shape used by `dispatchPipelineEvent`
  (`src/adapters/http/cloudevents_request.ts`).
- Document **Knative Serving** + optional **Eventing** (Broker, Trigger) under `deploy/` with
  **kind** instructions.

## Dependencies

Pinned in `deno.json` **import map** and `deno.lock`:

| Package           | Version  | Role                                                                                         |
| ----------------- | -------- | -------------------------------------------------------------------------------------------- |
| `npm:cloudevents` | `10.0.0` | Import key **`cloudevents`** → `HTTP.toEvent` in `src/adapters/http/cloudevents_request.ts`. |

## Review

| Field       | Value                                                                |
| ----------- | -------------------------------------------------------------------- |
| Approved by | (reviewer name or handle — after explicit approval of this ADR text) |
| Approved at | `YYYY-MM-DDTHH:mm:ssZ` (UTC — when approval was given)               |

## Consequences

- **Positive**: Spec-aligned parsing; Knative can deliver events without custom adapters beyond
  HTTP.
- **Negative**: Extra dependency; container must allow **net/env/read/write/ffi** for Deno runtime.
- **Follow-up**: Wire **Telegram** `OutboundNotifier` instead of `NoopOutboundNotifier` in
  `server.ts` when production-ready.
