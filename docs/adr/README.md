# Architecture Decision Records (ADR)

This folder holds **decision logs** for decisions that are **structural**, **hard to reverse**, or
**shape how contributors work**. Format: short **Nygard-style** records (context → **alternatives
considered** → decision → consequences). Each ADR records **rejected options** where they clarify
why the chosen approach won.

## Index

| ADR                                           | Title                                                     |
| --------------------------------------------- | --------------------------------------------------------- |
| [0001](0001-cloud-events-pipeline.md)         | CloudEvents-shaped internal pipeline for draw processing  |
| [0002](0002-drizzle-libsql-sqlite.md)         | Persistence with Drizzle ORM (libSQL/SQLite + PostgreSQL) |
| [0003](0003-http-cloudevents-knative.md)      | Inbound HTTP CloudEvents (`cloudevents` SDK) and Knative  |
| [0004](0004-documentation-and-adrs.md)        | Keep docs and ADRs in sync with code                      |
| [0005](0005-telegram-grammy.md)               | Telegram Bot API client (**grammY**)                      |
| [0006](0006-zod-config-and-i18n.md)           | Env validation (**Zod**) and **i18n** (`t()`, locales)    |
| [0007](0007-opentelemetry-metrics-tracing.md) | **OpenTelemetry** metrics and tracing (OTLP/HTTP)         |

## Dependency inventory

Third-party packages **pinned in `deno.json` / source / `package.json` overrides** are recorded per
ADR (versions in each ADR’s **Dependencies** section):

| ADR                                                        | Packages                                                                                                                                                                                                                         |
| ---------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [0001](0001-cloud-events-pipeline.md#dependencies)         | In-process pipeline: **none**; defers wire parsing to 0003.                                                                                                                                                                      |
| [0002](0002-drizzle-libsql-sqlite.md#dependencies)         | `drizzle-orm@0.45.2`, `@libsql/client@0.17.4`, `postgres@3.4.9`                                                                                                                                                                  |
| [0003](0003-http-cloudevents-knative.md#dependencies)      | `cloudevents@10.0.0`, transitive override `uuid@11.1.1`                                                                                                                                                                          |
| [0005](0005-telegram-grammy.md#dependencies)               | `grammy@1.44.0`                                                                                                                                                                                                                  |
| [0006](0006-zod-config-and-i18n.md#dependencies)           | `@std/dotenv@0.225.7`, `zod@4.4.3`                                                                                                                                                                                               |
| [0007](0007-opentelemetry-metrics-tracing.md#dependencies) | `@opentelemetry/api@1.9.1`, `context-async-hooks@2.8.0`, `sdk-trace-base@2.8.0`, `sdk-metrics@2.8.0`, `resources@2.8.0`, `exporter-trace-otlp-http@0.219.0`, `exporter-metrics-otlp-http@0.219.0`, `semantic-conventions@1.41.1` |

**Test-only** (not product ADRs): `jsr:@std/assert@1` in unit and e2e tests.

**Agents:** Adding a **runtime dependency** is **not** done until the matching ADR **Dependencies**
row (or new ADR) and this inventory are updated in the **same change** as `deno.json` / source — see
[ADR 0004 §6](0004-documentation-and-adrs.md).

## When to add an ADR

Add or update an ADR when you change **architecture**, **stack** (DB, messaging, hosting
integration), **security boundaries**, or **cross-cutting rules** (e.g. event model). Small bugfixes
and refactors that do not change intent usually need only **commit message** + updates to
`docs/architecture.md` if behaviour is user-visible.

## ADR approval and reviewer name

When a change requires a **new ADR** or a **material update** to an existing ADR:

1. **Ask the user** (or designated maintainer) whether they **approve** recording the decision in
   the ADR as drafted.
2. If they **approve**, fill in the **Review** table (see [template](../templates/adr-template.md))
   with **Approved by:** their **name or handle** (use exactly what they give you) and **Approved
   at:** an **ISO 8601 UTC timestamp** when they approved (e.g. `2025-03-22T14:30:00Z`).
3. If they **do not** approve or want to defer, update `docs/architecture.md` and related docs only;
   do **not** add a fake reviewer name or timestamp.

Every ADR in this folder includes a **Review** section; placeholders stay until a maintainer
approves.

## Numbering

Use the next free `NNNN-short-title.md`. Rejected superseded decisions can be marked **Deprecated**
in the file and referenced from the replacement ADR.
