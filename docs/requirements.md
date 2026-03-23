# Requirements — Szerencsejáték Telegram bot

**Canonical product spec** for this repo. **Agents and contributors:** when behaviour or scope
changes, update this file (and `docs/architecture.md` / ADRs as appropriate) in the **same change**
as code. Use **FR-** / **NFR-** IDs in commits and reviews where helpful.

## 1. Vision

A **Telegram bot** that lets users **record which lottery numbers they played** for Szerencsejáték
Zrt. games. When **new official results** are available, the bot **sends a message** with the
**winning numbers** and a **per-user summary** of whether their registered lines matched (e.g.
number of hits, optional prize tier in later phases).

## 2. Stakeholders

- **Players**: want timely notifications and clear match feedback without using unofficial “checker”
  sites manually.
- **Operator (you / product)**: maintainable Deno codebase, predictable cost, compliance with
  Telegram and local regulations.

## 3. Functional requirements

### FR-1 — User identity

- The bot identifies users by **Telegram `user_id`** (and stores `chat_id` for messaging as required
  by the Bot API).

### FR-2 — Register played numbers

- Users can **add**, **list**, and **remove** stored lines for a **selected game**.
- Each **line** is a valid combination according to that game’s rules (ranges, count of picks,
  optional supplementary numbers).
- The system rejects invalid input with a **clear Hungarian error message**.

**v1 (Ötöslottó) — implemented commands** (Hungarian copy; see §10):

| Command   | Purpose                                                                        |
| --------- | ------------------------------------------------------------------------------ |
| `/start`  | Welcome; registers/updates user.                                               |
| `/help`   | Game rules and command summary.                                                |
| `/add`    | Add a line: five distinct integers in [1, 90].                                 |
| `/lines`  | List stored lines (numbered for `/remove`).                                    |
| `/remove` | Remove line by index from `/lines`.                                            |
| `/result` | Show **last persisted** draw result for this bot (from DB), not a live scrape. |

### FR-3 — Draw results ingestion

- The system obtains **official draw results** for supported games on a defined schedule or when
  notified.
- **Idempotency**: the same draw must not notify users twice.

**Implementation:** draws stored in SQLite; `tryInsertDraw` + unique `(game_id, draw_key)`; pipeline
events in `src/events/otoslotto_pipeline.ts`. Ingestion: **`BetHuOtoslottoFetcher`** (§7),
**manual** `draw.result.persist`, or **stub** in tests (`StubDrawResultFetcher`).

### FR-4 — Match calculation

- For each user line relevant to a completed draw, compute **matches**:
  - **MVP**: count of matching main numbers (order-independent).
  - **Later**: map hits to **prize tiers** per official rules (requires full rule engine per game).

**Implementation:** `countHits` + `formatOtoslottoUserMessage` (HTML for Telegram `parse_mode`).

### FR-5 — Notifications

- After new results are processed, send users a message containing:
  - Game name and draw identifier (date / draw number).
  - Winning numbers (and supplementary numbers if applicable).
  - For each stored line (or an aggregate): hits and/or tier.

**Implementation:** `OutboundNotifier`; Telegram adapter uses **HTML** parse mode; messages built
via `src/i18n/` (`t()`, locale files) and `format_otoslotto_user_message.ts`. **Formatting:** use
`<code>` for **numeric** values; do **not** wrap **slash-commands** in `<code>` (product rule).

### FR-6 — Opt out

- Users can **pause** or **delete** all data related to them (`/stop` or equivalent).

**Status:** **Not implemented** in v1 — backlog; do not document as shipped.

## 4. Non-functional requirements

| ID    | Requirement                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| NFR-1 | **Availability**: bot responds to commands reliably; background jobs retry on transient failures.                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| NFR-2 | **Privacy**: minimize stored data; no logging of full number sets with user identity in plain text.                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| NFR-3 | **Observability**: **OpenTelemetry** metrics and traces when **`OTEL_EXPORTER_OTLP_ENDPOINT`** is set (OTLP/HTTP); HTTP, pipeline, and Telegram spans; see [ADR 0007](adr/0007-opentelemetry-metrics-tracing.md). **Structured logging** via `src/logging/` — **`LOG_FORMAT=json`** for one JSON object per line; **`LOG_LEVEL`** filters severity; **`trace_id`** / **`span_id`** (W3C hex) when an OpenTelemetry span is active. Handler logs include `http.handler`, `pipeline.handler`, `telegram.handler` (no chat bodies or tokens). |
| NFR-4 | **i18n**: user-facing strings via **`t(locale, key)`**; v1 locale **Hungarian** (`hu`); no user-visible copy inline in application logic without translation keys.                                                                                                                                                                                                                                                                                                                                                                         |
| NFR-5 | **Configuration:** environment validated at startup (**Zod** in `src/config/env.ts`); optional `.env` loaded via **`@std/dotenv`** (see [ADR 0006](adr/0006-zod-config-and-i18n.md)).                                                                                                                                                                                                                                                                                                                                                      |

## 5. Out of scope (initial release)

- Purchasing tickets or integrating with Szerencsejáték accounts.
- Guaranteed sub-minute latency from TV/live draw to notification.
- Legal or tax advice; the bot is an **informational aid** based on user-stored numbers and
  published results.

## 6. Supported games

**v1 (current implementation focus):** **Ötöslottó** — domain and pipeline types live under
`src/domain/otoslotto/` and `src/events/otoslotto_pipeline.ts`.

**Later:** Additional games (Hatoslottó, Skandináv, Keno, Joker, …) require separate rule modules
and requirements updates per game.

## 7. Data source for results

**Implemented (Ötöslottó):** **`BetHuOtoslottoFetcher`** calls the operator’s public JSON endpoint
(`bet.szerencsejatek.hu` **`PublicInfo/ResultJSON.aspx?game=LOTTO5&query=last`**), the same feed
used by the official “lottószámok” UI. Override with **`OTOSLOTTO_RESULT_JSON_URL`** if the URL
changes.

- **Option B** remains available: **manual** `draw.result.persist` or tooling (see pipeline).
- **Option C** (arbitrary scraping) is **not** used — the fetcher uses the structured **public
  JSON** feed only.

The pipeline supports **manual** or **fetcher-driven** paths into `draw.result.persist`; see
`docs/architecture.md` §2.1.

## 8. Product decisions (locked vs open)

| Topic                 | Decision                                                                                                                           |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| First game            | **Ötöslottó**                                                                                                                      |
| Notifications         | **One message per draw per user** (one `user.notification.requested` per subscriber).                                              |
| Storage               | **SQLite** on server via **Drizzle** + **libSQL** (file DB; path via env).                                                         |
| User-facing language  | **Hungarian** for v1 (`NFR-4`).                                                                                                    |
| Results source (prod) | **Ötöslottó:** `BetHuOtoslottoFetcher` + `OTOSLOTTO_RESULT_JSON_URL` (default: bet.hu PublicInfo LOTTO5).                          |
| Hosting (prod)        | **Open** — VPS, Deno Deploy, or **Kubernetes** (Helm default: long polling + internal HTTP + CronJob; optional webhook / Knative). |

## 9. Traceability (requirements → code)

| ID    | Primary locations                                                                                                                                                 |
| ----- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| FR-1  | `src/adapters/persistence/drizzle/user_repository.ts`, `register_handlers` → `upsertUser`                                                                         |
| FR-2  | `src/telegram/register_handlers.ts`, `src/domain/otoslotto/line.ts`, `played_line_repository`                                                                     |
| FR-3  | `BetHuOtoslottoFetcher`, `handle_draw_update_requested`, `handle_draw_result_persist`, `DrizzleDrawRecordRepository`                                              |
| FR-4  | `src/domain/otoslotto/match.ts`, `format_otoslotto_user_message.ts`                                                                                               |
| FR-5  | `handle_draw_result_stored`, `handle_user_notification_requested`, `TelegramOutboundNotifier`                                                                     |
| FR-6  | _Not implemented_                                                                                                                                                 |
| NFR-3 | `src/observability/`, `src/logging/`, `src/server.ts`, `src/application/dispatch.ts`, `register_handlers` — [ADR 0007](adr/0007-opentelemetry-metrics-tracing.md) |
| NFR-4 | `src/i18n/`, `src/telegram/translate_line_error.ts`                                                                                                               |
| NFR-5 | `src/config/env.ts`, [ADR 0006](adr/0006-zod-config-and-i18n.md)                                                                                                  |

## 10. Telegram UX (v1)

- **Transport:** long polling (`src/telegram_bot.ts`), webhook (`src/server.ts`), or **Helm**
  **longPolling** mode (both in one Pod); see `docs/local-telegram-testing.md` and
  `deploy/helm/szerencsejatek-telegram-bot/README.md`.
- **Replies:** HTML (`parse_mode: "HTML"`); lists and bold for structure; **numbers** in `<code>`,
  **not** slash-commands (see FR-5).
- **`/result`:** last row in `draws` for `GAME_ID` by `created_at` — informational only until a
  production ingestion strategy exists (§7).

## 11. Open questions

1. **Production results source** (§7): API vs manual vs scraping — owner, timeline, legal review.
2. **FR-6** opt-out: exact commands (`/stop`?), retention, and GDPR wording.
3. **Rate limits** and batching for large subscriber lists (see `docs/design-plan.md` risks).

---

_Last updated: hosting / transport aligned with Helm defaults (long polling, CronJob, ClusterIP);
requirements traceability, Telegram/HTML/i18n, NFR-5; align with pipeline and `docs/adr/`._
