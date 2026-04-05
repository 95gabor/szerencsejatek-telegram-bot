# Design plan — delivery phases

## Phase 0 — Foundation (current)

- [x] Repo scaffold: Deno config, documentation, Cursor rules/skills/commands.
- [x] HTTP health and CloudEvents `POST /` (`src/server.ts`); `deno task check` (fmt, lint, unit
      tests).
- [x] kind smoke: `scripts/kind-e2e.sh` applies Knative CRDs, client dry-run on `deploy/knative/*`,
      **Helm lint**, Docker build/load, **Helm install** (`workload.mode=httpServer`,
      `cronjob.enabled=false`); CI `deno task test:e2e`.
- [x] Minimal bot: `/start`, `/help`, `/add`, `/lines`, `/remove`, `/result` (see
      `docs/requirements.md` §3); Telegram wired in `server.ts` (webhook) and `telegram_bot.ts`
      (long polling).

**Exit criteria (Phase 0)**: CI green; HTTP entry and pipeline testable without Telegram.

## Phase 1 — Single game MVP

- [x] **Ötöslottó** domain types and pipeline (`draw.*` / `user.notification.requested` events).
- [x] Persist draws and played lines (SQLite + Drizzle + libSQL).
- [x] User-facing commands to register/list/remove lines and view last stored result (`/result`).
- [ ] **Manual result entry** path documented for operators (emit `draw.result.persist` or admin
      flow); pipeline supports it; UX/docs polish TBD.
- [x] Match / message formatting: hit count per line (`format_otoslotto_user_message`).
- [x] Notify path exists (`OutboundNotifier`; default **noop** until Telegram is wired).

**Exit criteria**: End-to-end demo: register lines → inject result → receive match message (real
Telegram or test double).

## Phase 2 — Automated results

- [ ] Pluggable **ingestion** module for the chosen official source.
- [ ] Scheduler (cron or queue) with retries and backoff. **Note:** Helm **`CronJob`** already posts
      `draw.update.requested` hourly in **`workload.mode: longPolling`**; Phase 2 may extend
      backoff, observability, or non-Kubernetes schedulers.
- [ ] Stronger idempotency and monitoring.

**Exit criteria**: No manual result entry for supported games in steady state.

## Phase 3 — Multi-game and tiers

- [ ] Additional games with separate rule modules.
- [ ] Optional prize-tier mapping where rules are codified.
- [ ] User preferences (which games to follow).
- [ ] Ticket validity window preferences: user can choose single draw, fixed multi-week (e.g. 5
      weeks), custom N weeks, or continuous participation until stopped.

## Risks

| Risk                        | Impact | Plan                                                                         |
| --------------------------- | ------ | ---------------------------------------------------------------------------- |
| Legal / ToS on data sources | High   | Document source in `docs/requirements.md`; prefer official/partner channels. |
| Telegram rate limits        | Medium | Batch sends; exponential backoff.                                            |
| Incorrect match rules       | High   | Property tests on known published results for each game.                     |

## Milestones → docs

When scope changes, update **requirements** first, then **architecture**, then code. Add or amend an
**ADR** in `docs/adr/` when the change is a durable architectural decision (see
`docs/adr/0004-documentation-and-adrs.md` and `docs/adr/README.md`). **Ask the user for approval**
before finalizing new or materially changed architecture ADRs; if they approve, record **Approved
by** and **Approved at** (UTC ISO timestamp) in the ADR **Review** section.
