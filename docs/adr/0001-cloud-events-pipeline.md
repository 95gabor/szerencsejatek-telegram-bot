# ADR 0001: CloudEvents-shaped internal pipeline

## Status

Accepted

## Context

The bot must process draw updates, persist results once, fan out to subscribers, and send
notifications. We want **clear stages**, **testable handlers**, and alignment with **CNCF
CloudEvents** so future transports (HTTP, queues) can reuse the same event shapes.

## Alternatives considered

| Option                                                     | Summary                                                                                                                                                                                       |
| ---------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Monolithic orchestrator**                                | One async function (`fetch → persist → notify`) in a single module — **fewer files**, but **weaker seams** for tests, harder to swap transports, and no stable envelope for external systems. |
| **Plain JSON / ad-hoc events**                             | Custom `{ type, data }` without **CloudEvents** metadata — minimal overhead, but **no CNCF interop** with Knative, brokers, or other tools that expect `specversion`, `id`, `source`, `type`. |
| **In-process only, no types**                              | Direct calls (`persistDraw(); notifyUsers()`) with **no event objects** — simplest coupling; **opaque** boundaries and painful evolution if HTTP or a queue is added later.                   |
| **External broker** (NATS, RabbitMQ, Kafka, Redis streams) | Durable, scalable fan-out — **ops and infra cost** for a small bot; a fit when multiple runtimes or replay matter; **deferred** until scale or multi-service boundaries justify it.           |
| **Workflow engine** (Temporal, etc.)                       | Durable execution, retries, visibility — **heavy** for “process one draw and notify”; reconsider if pipelines become long-running or need human approval.                                     |

## Decision

Model the Ötöslottó flow as **small handlers** connected by **CloudEvents v1.0**-compatible messages
(`src/events/otoslotto_pipeline.ts`). Types include `draw.update.requested`, `draw.result.persist`,
`draw.result.stored`, and `user.notification.requested`. Routing is centralized in
`dispatchPipelineEvent`; `createPipelineEmitter` provides recursive `emit` for follow-up events.

## Dependencies

| Package / scope            | Version | Notes                                                                                                                                                                                                                                    |
| -------------------------- | ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| _(none — in-process only)_ | —       | Event shapes and `createCloudEvent` live in `src/events/` (TypeScript only). **Inbound HTTP** parsing that maps wire CloudEvents uses the **`cloudevents`** npm package — see [ADR 0003](0003-http-cloudevents-knative.md#dependencies). |

## Review

| Field       | Value                                                                |
| ----------- | -------------------------------------------------------------------- |
| Approved by | (reviewer name or handle — after explicit approval of this ADR text) |
| Approved at | `YYYY-MM-DDTHH:mm:ssZ` (UTC — when approval was given)               |

## Consequences

- **Positive**: Easy to reason about order; ports stay swappable; matches CloudEvents mental model.
- **Negative**: More files than a single orchestrator; deep `emit` chains use stack depth
  (acceptable at expected volumes).
- **Follow-up**: Optional adoption of the full `cloudevents` wire protocol everywhere; today
  internal types may use `createCloudEvent` helpers without the npm package for in-process-only
  paths.
