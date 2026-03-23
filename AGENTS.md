# Agent instructions — Szerencsejáték Telegram bot

This repository implements a **Telegram bot** for Hungarian lottery players (Szerencsejáték Zrt.
games). The stack is **TypeScript on Deno**.

**Repository:** https://github.com/95gabor/szerencsejatek-telegram-bot

## Goals

- Users **register played numbers** (per game type / draw).
- When **official results** are published, the bot **notifies subscribers** with the winning numbers
  and **whether each user’s ticket matched** (hits per prize tier or simple match counts—see
  `docs/requirements.md`).

## Requirements (canonical spec)

- **`docs/requirements.md`** is the **single source of truth** for functional/non-functional
  requirements (**FR-** / **NFR-** IDs), Telegram command set, implementation **traceability**, open
  questions, and product rules (e.g. HTML formatting, i18n, what is **not** implemented such as
  **FR-6** opt-out).
- **Before closing a change** that affects user-visible behaviour, scope, or compliance: update
  **`docs/requirements.md`** (and **`docs/design-plan.md`** if phase/milestone shifts). Do not add
  features in code without reflecting them here—or explicitly mark them experimental in
  requirements.
- **Agents:** Prefer citing **FR-x / NFR-x** when implementing or reviewing so drift between docs
  and code stays visible.

## Non-goals (unless product asks)

- Selling tickets or taking payments.
- Guaranteeing real-time results before official publication.

## Where to look

| Topic                          | Location                                                                                         |
| ------------------------------ | ------------------------------------------------------------------------------------------------ |
| Requirements & open questions  | `docs/requirements.md`                                                                           |
| System design / HLD            | `docs/architecture.md` (§1 HLD, then components & deployment)                                    |
| Architecture decisions (ADRs)  | `docs/adr/README.md` (incl. [dependency inventory](docs/adr/README.md#dependency-inventory))     |
| Metrics & tracing (OTel)       | [ADR 0007](docs/adr/0007-opentelemetry-metrics-tracing.md), `src/observability/`                 |
| Structured logging             | `src/logging/` (`LOG_FORMAT`, `LOG_LEVEL`; `trace_id` / `span_id` when OTel span active)         |
| Local testing vs real Telegram | `docs/local-telegram-testing.md`                                                                 |
| Deploy / Helm / kind           | `deploy/README.md`, `deploy/helm/szerencsejatek-telegram-bot/README.md`, `deploy/kind/README.md` |
| Phasing & risks                | `docs/design-plan.md`                                                                            |
| Deno / TS conventions          | `.cursor/rules/`                                                                                 |
| Domain + workflows             | `.cursor/skills/szerencsejatek-telegram-bot/SKILL.md`                                            |

## Result pipeline (Ötöslottó)

Use **CloudEvents-shaped** steps and explicit names (see `docs/architecture.md` §2.1):

1. `draw.update.requested` → fetch → **`draw.result.persist`**
2. **`draw.result.persist`** → store if new → **`draw.result.stored`**
3. **`draw.result.stored`** → load players → **`user.notification.requested`** (one per user)
4. **`user.notification.requested`** → `OutboundNotifier` (Telegram today)

Router: `src/application/dispatch.ts`. Prefer **clarity over cleverness** in handlers.

## Documentation and ADRs

- After **meaningful code changes**, update the relevant **`docs/`** files so behaviour and
  structure stay accurate (`architecture`, `requirements`, `design-plan`, or `README` as
  appropriate).
- When a change reflects a **durable architectural or stack decision**, **update or add ADRs** so
  `docs/architecture.md` and `docs/adr/` stay aligned (see `docs/adr/README.md` and
  [ADR 0004](docs/adr/0004-documentation-and-adrs.md)).
- **New runtime dependencies** (new `npm:` / `jsr:` in `deno.json` import map or new pinned `npm:`
  in `src/`): **in the same change**, **record the ADR** — update the relevant ADR’s
  **Dependencies** section (package + version) or add a **new ADR** with **Alternatives considered**
  when the library choice matters; update `docs/adr/README.md` (**Dependency inventory** and index).
  Same pattern as for new libraries generally: **document the decision in ADRs**, not only in
  `deno.lock`.
- **Before** merging **new** ADR text or **material amendments** (decision, alternatives,
  supersession) for architecture changes: **ask the user** whether they **approve** the ADR wording.
  If they **approve**, add the **Review** section to that ADR with **Approved by:** the reviewer
  **name or handle** they provide and **Approved at:** an **ISO 8601 UTC timestamp** for when they
  approved (e.g. `2025-03-22T14:30:00Z`). **Never** invent a reviewer name or timestamp. If they do
  not approve, update narrative docs only or leave the ADR for a later PR.

## Implementation rules

- **No trivial comments in code** — avoid restating the obvious, decorative section markers, and
  filler. Use good naming and structure instead; comment only where the reader needs extra context
  (subtle invariants, legal/compliance, or pointers to `docs/`).
- Prefer **small, testable modules** (parsing, matching, scheduling) over a single large handler
  file.
- **Never** scrape or bypass Szerencsejáték sites without an explicit product decision documented in
  `docs/requirements.md` (legal/compliance).
- Keep **user data** (chat IDs, played numbers) out of logs; use structured logging with redaction.
- Use **Deno-native** tooling (`deno task`, `deno fmt`, `deno lint`, `deno test`).

## After each iteration

Before considering a change **done**, **review the code** (same session or follow-up):

- Run `deno task check` (fmt, lint, tests) and fix failures.
- Re-read the diff: scope creep, naming, error paths, and alignment with `docs/architecture.md` and
  ADRs when the decision surface changed. If **`deno.json` or imports** changed, confirm ADR
  **Dependencies** / inventory were updated (see § Documentation and ADRs — new dependencies).
- If the iteration **introduced or materially changed** **env validation** (Zod schema), **i18n**
  layout (new locales / `t()` keys as a pattern), or another **ADR-worthy** cross-cutting rule: **do
  not** treat the work as complete until **`docs/adr/`** (new or amended ADR) and
  **`docs/adr/README.md`** (index + dependency inventory when a new runtime package is pinned) are
  updated **in the same change** as the code—avoid “ADR in a follow-up PR” drift.
- Remove dead code, trivial comments, and debug leftovers.
- For behaviour changes, ensure tests or manual rationale is updated.

Use `.cursor/commands/review-iteration.md` for a structured pass when helpful.

## When unsure

If the spec does not define behaviour (e.g. which games are in v1, exact match rules, data source),
**ask the user** or add a `TODO` with a pointer to `docs/requirements.md` “Open questions”.
