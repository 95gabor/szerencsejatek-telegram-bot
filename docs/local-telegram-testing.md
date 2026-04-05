# Local testing with a real Telegram bot

Use this when you want to **talk to your bot in Telegram** from your machine (real Bot API, real
updates). Automated tests under `src/` and `tests/e2e` use mocks or SQLite only; they do **not**
replace manual checks of commands and persistence.

## 1. Create a bot and token

1. Open [@BotFather](https://t.me/BotFather) in Telegram.
2. Send `/newbot` (or use an existing bot) and copy the **HTTP API token**.
3. In the project root, copy `.env.example` to `.env` and set:

   ```bash
   BOT_TOKEN=<paste token here>
   ```

   Other variables are optional for this flow; defaults are fine (`DATABASE_URL=file:./data/app.db`,
   `GAME_ID=otoslotto`, `DEFAULT_LOCALE=hu`).

On startup, `loadConfig()` loads `./.env` into the process environment (via `@std/dotenv`); values
already set in the shell take precedence.

**Security:** Do not commit `.env` or paste the token into chat logs or screenshots.

## 2. Run the bot with long polling (recommended locally)

Telegram requires **HTTPS** for webhooks. On your laptop you usually **do not** have a stable public
HTTPS URL, so use **long polling**: the process polls Telegram for updates. Entry point:
`src/telegram_bot.ts`.

```bash
deno task bot
```

Or with auto-reload while you edit code:

```bash
deno task bot:watch
```

On startup the script **clears the webhook** (`deleteWebhook`) so Telegram sends updates to the
long-polling client instead of an old HTTPS endpoint.

**What to do in Telegram:** open a chat with your bot (current public bot:
[@SzerencsejatekChatBot](https://t.me/SzerencsejatekChatBot)), send `/start`, then try e.g. `/help`,
`/add 1 2 3 4 5`, `/lines`, `/result` (last stored draw result, if the pipeline has already
persisted one), `/remove 1` as documented in the bot’s help text.

**Data:** user and line rows are stored in the SQLite file implied by `DATABASE_URL` (default
`./data/app.db` under the project root).

## 3. Do not run two modes on the same token

| Mode                  | Command                             | How updates arrive                                         |
| --------------------- | ----------------------------------- | ---------------------------------------------------------- |
| Long polling          | `deno task bot`                     | This process polls Telegram.                               |
| HTTP server + webhook | `deno task dev` / `deno task start` | Telegram POSTs to your public URL if `WEBHOOK_URL` is set. |

Use **one** mode per token at a time. If you use `server.ts` with `WEBHOOK_URL` pointing at a
deployed URL, do not run `telegram_bot.ts` against the same token simultaneously.

## 4. Optional: local webhook testing (HTTPS tunnel)

To exercise the **same** code path as production (`src/server.ts` + grammY `webhookCallback`):

1. Start the server (with `BOT_TOKEN` and a tunnel URL):

   ```bash
   BOT_TOKEN=... WEBHOOK_URL=https://<your-subdomain>.ngrok-free.app deno task dev
   ```

   Use your tunnel tool of choice (**ngrok**, **Cloudflare Tunnel**, etc.); the URL must be
   **HTTPS** and reachable from the internet.

2. Set `TELEGRAM_WEBHOOK_PATH` if you change the default (`/telegram/webhook`).

3. Optionally set `TELEGRAM_WEBHOOK_SECRET` and ensure the same value is sent when Telegram calls
   your webhook (see `src/server.ts`).

4. Do **not** run `deno task bot` while this is active for the same token.

## 5. What this does _not_ cover

- **Pipeline / draw notifications** (CloudEvents, `POST /`, fetch result, notify users) are separate
  from “chat with the bot”. With **`deno task start`** running locally, you can trigger a draw check
  via **`deno task check-result`** (sends `draw.update.requested` to `POST /`). For remote clusters,
  set **`PIPELINE_BASE_URL`**. In **Kubernetes**, the Helm chart’s **CronJob** (when
  **`cronjob.enabled`**) runs the same script on a schedule against the in-cluster Service URL for
  **`server.ts`** — for **long polling**, **httpServer**, or **Knative** installs.

- **Deploy / Helm** defaults and alternatives:
  [deploy/helm/szerencsejatek-telegram-bot/README.md](../deploy/helm/szerencsejatek-telegram-bot/README.md),
  [deploy/README.md](../deploy/README.md).

- **kind**: CI smoke vs **local Telegram in cluster** —
  [deploy/kind/README.md](../deploy/kind/README.md) (**`deno task kind:telegram`**).

## 6. Troubleshooting

| Symptom                     | What to check                                                                                                                   |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| Bot never responds          | `BOT_TOKEN` correct in `.env`; only one process using the token; `deno task bot` running.                                       |
| “Conflict” or flaky updates | Another instance or webhook still registered; run long polling once (`bot` clears webhook) or call `deleteWebhook` via Bot API. |
| Permission / network errors | Corporate firewall blocking `api.telegram.org`; try another network.                                                            |
