---
name: szerencsejatek-telegram-bot
description: >-
  Implements and maintains the Szerencsejáték Zrt. lottery Telegram bot on Deno
  and TypeScript. Covers Hungarian lottery game types (e.g. Ötöslottó, Hatoslottó,
  Skandináv, Keno), user ticket storage, draw result ingestion, match calculation,
  and Telegram notifications. Use when editing bot code, draw logic, storage,
  scheduling, or compliance around official results.
---

# Szerencsejáték Telegram bot

## Domain summary

- **Szerencsejáték Zrt.** operates regulated lottery games in Hungary. Game rules (field sizes,
  prize tiers, draw schedule) differ per game.
- Users **store numbers they played** (one or more lines per game). The bot **does not** place bets;
  it only tracks what the user says they played and compares to **published** results.

## Requirements

- **Authoritative list:** `docs/requirements.md` — **FR-1…FR-6**, **NFR-1…NFR-5**, command table
  (§3), traceability map (§9), open questions (§11). **Update requirements in the same PR** when
  changing behaviour or scope agents would consider “product”.
- **Not shipped:** e.g. **FR-6** (opt-out) — check §3/§9 before documenting or implementing.

## Product flow

1. User registers lines via Telegram commands (see **FR-2** / `docs/requirements.md` §3 table).
2. **Draw pipeline** (CloudEvents, see `docs/architecture.md` §2.1): `draw.update.requested` → fetch
   → `draw.result.persist` → DB insert if new → `draw.result.stored` → for each subscriber
   `user.notification.requested` → `OutboundNotifier` (Telegram or future adapters).
3. **Matching** per line: hit count (see `format_otoslotto_user_message`); prize tiers later.

## Technical expectations

- **End of iteration**: Review the code before closing the task — run `deno task check`, scan the
  diff for scope creep and regressions, align with `docs/` (see `AGENTS.md` § After each iteration).
- **Comments**: Do not add trivial or redundant comments; prefer explicit names and small functions.
  Comment only for non-obvious rationale, invariants, or compliance (see `AGENTS.md`).
- **Observability**: **OpenTelemetry** metrics/traces when `OTEL_EXPORTER_OTLP_ENDPOINT` is set —
  see [ADR 0007](../../../docs/adr/0007-opentelemetry-metrics-tracing.md) and `src/observability/`.
- **Stack**: TypeScript, Deno. Persist draws and lines with **Drizzle** + **libSQL** (SQLite file)
  as in `docs/architecture.md` and [ADR 0002](../../../docs/adr/0002-drizzle-libsql-sqlite.md). HTTP
  entry: `src/server.ts` (CloudEvents). Keep `docs/` and `docs/adr/` aligned after substantive edits
  ([ADR 0004](../../../docs/adr/0004-documentation-and-adrs.md)). For architecture ADRs: **ask the
  user to approve** ADR text before filling **Approved by** and **Approved at** (UTC ISO timestamp)
  in the **Review** section.
- **New dependencies**: When you add **npm:** or **jsr:** imports (import map or pinned in `src/`),
  **record it in the same PR** in the appropriate ADR **Dependencies** section (or a new ADR) and
  [dependency inventory](../../../docs/adr/README.md#dependency-inventory)—same rule as
  [ADR 0004 §6](../../../docs/adr/0004-documentation-and-adrs.md).
- **Matching**: Implement pure functions: `(drawResult, userLine) => MatchResult`. Unit test edge
  cases (duplicate numbers, order independence).
- **Results source**: Follow the chosen strategy in requirements (official API, RSS, manual admin,
  etc.). Do not add scraping without updating `docs/requirements.md` and user approval.

## Copy and locale

- **NFR-4:** All user-visible strings through **`src/i18n/`** (`t()`, `locales/hu.ts`). Hungarian
  v1.
- Telegram **HTML** for notifications and replies: **`<code>` for numbers**, not for slash-commands
  (see **FR-5** in `docs/requirements.md`). Keep messages concise: game name, draw id, winning
  numbers, per-line hits.

## Files to update together

- Changing game rules: `src/domain/*`, tests, **`docs/requirements.md`** (and architecture if
  needed).
- Changing notification or command behaviour: **`docs/requirements.md`** §3/§9/§10, i18n keys,
  tests.
