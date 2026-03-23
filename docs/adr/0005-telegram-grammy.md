# ADR 0005: Telegram client library (grammY)

## Status

Accepted

## Context

Users interact via **Telegram** (commands, outbound draw notifications). We need a **maintained**
Bot API wrapper with a good **TypeScript** story and **Deno** compatibility via **`npm:`**
specifiers. **Knative scale-to-zero** requires **webhooks** (HTTPS POST from Telegram), not long
polling.

## Alternatives considered

| Option                     | Summary                                                                                                                                 |
| -------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| **Telegraf**               | Mature middleware model; heavier; Deno works via npm; team preferred grammY’s **lighter** API for this codebase.                        |
| **node-telegram-bot-api**  | Callback style; fewer TS-first patterns; less idiomatic for modern async handlers.                                                      |
| **Raw `fetch` to Bot API** | No dependency; **verbose** (polling loop, file uploads, types); rejected for velocity and error handling.                               |
| **grammY**                 | **Active** development, **TypeScript-first**, `webhookCallback(..., "std/http")` for **`Deno.serve`**, plus long polling for local dev. |

## Decision

Use **grammY** for:

- **Production / Knative:** **`webhookCallback(bot, "std/http")`** on **`src/server.ts`** at
  **`TELEGRAM_WEBHOOK_PATH`** (default **`/telegram/webhook`**), with optional
  **`TELEGRAM_WEBHOOK_SECRET`** (`X-Telegram-Bot-Api-Secret-Token`). When **`WEBHOOK_URL`** is set,
  **`setWebhook`** runs at startup. **`TelegramOutboundNotifier`** shares the same **`Bot`**
  instance as command handlers so draw notifications use the Bot API.
- **Local dev:** **`src/telegram_bot.ts`** — **long polling** after **`deleteWebhook`**, when no
  public HTTPS URL is available.

## Dependencies

Pinned in `deno.json` **import map** and `deno.lock`:

| Package      | Version  | Role                                                                 |
| ------------ | -------- | -------------------------------------------------------------------- |
| `npm:grammy` | `1.38.4` | Import key **`grammy`** → `Bot`, `webhookCallback`, command routing. |

## Review

| Field       | Value                                                                |
| ----------- | -------------------------------------------------------------------- |
| Approved by | (reviewer name or handle — after explicit approval of this ADR text) |
| Approved at | `YYYY-MM-DDTHH:mm:ssZ` (UTC — when approval was given)               |

## Kubernetes packaging (Helm)

The **Helm** chart default (`workload.mode: longPolling`, `ingress.enabled: false`) runs
**`telegram_bot.ts`** and **`server.ts`** in **one Pod** (long polling + **ClusterIP-only** HTTP for
CloudEvents and notifier). A **CronJob** triggers **`draw.update.requested`** hourly via
`scripts/check_draw_result.ts`. **Webhook + Knative** remain available via **`httpServer`** or
**`knative.enabled: true`** (see `deploy/helm/szerencsejatek-telegram-bot/README.md`). This does not
change the **grammY** choice; it documents how both transport styles coexist in production.

## Consequences

- **Positive**: **Scale-to-zero** compatible via webhooks; one process for CloudEvents + Telegram +
  shared notifier for the draw pipeline.
- **Negative**: **`WEBHOOK_URL`** must be **HTTPS** and reachable by Telegram; cold starts may add
  latency on first webhook after idle (Telegram retries).
- **Follow-up**: Harden **`TELEGRAM_WEBHOOK_SECRET`** in production (Knative Secret → env).
