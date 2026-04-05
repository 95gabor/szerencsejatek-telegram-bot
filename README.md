# Szerencsejáték Telegram bot

Telegram bot (**TypeScript / Deno**) for players of
[Szerencsejáték Zrt.](https://www.szerencsejatek.hu/) games: users **save the numbers they played**,
and when **official results** are available the bot **notifies** them with the winning numbers and
**whether their lines matched**.

**Repository:**
[github.com/95gabor/szerencsejatek-telegram-bot](https://github.com/95gabor/szerencsejatek-telegram-bot)

## Documentation

| Document                                                                                               | Purpose                                                                                       |
| ------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------- |
| [docs/requirements.md](docs/requirements.md)                                                           | Functional/non-functional requirements and **open questions**                                 |
| [docs/architecture.md](docs/architecture.md)                                                           | **HLD** (§1), components, pipeline, tech stack, deployment modes                              |
| [deploy/README.md](deploy/README.md)                                                                   | **Deploy** index (Helm, kind, Dockerfile)                                                     |
| [deploy/helm/szerencsejatek-telegram-bot/README.md](deploy/helm/szerencsejatek-telegram-bot/README.md) | **Helm** — long polling + CronJob by default, optional webhook / Knative                      |
| [deploy/kind/README.md](deploy/kind/README.md)                                                         | **kind**: CI e2e smoke, **local Telegram** (`kind-telegram-local.sh`), Knative manual install |
| [docs/design-plan.md](docs/design-plan.md)                                                             | Phased delivery and risks                                                                     |
| [docs/adr/README.md](docs/adr/README.md)                                                               | Architecture decision records (ADRs)                                                          |
| [docs/local-telegram-testing.md](docs/local-telegram-testing.md)                                       | **Local dev with a real Telegram bot** (long polling, optional webhook tunnel)                |
| [AGENTS.md](AGENTS.md)                                                                                 | Short agent / contributor context                                                             |
| [CONTRIBUTING.md](CONTRIBUTING.md)                                                                     | **Contributing** — PRs, checks, review; maintainer branch-protection notes                    |
| [SECURITY.md](SECURITY.md)                                                                             | **Security** — reporting vulnerabilities responsibly                                          |

## AI-assisted development (Cursor)

- **Rules**: `.cursor/rules/` — project, Deno/TS, Telegram patterns.
- **Skill**: `.cursor/skills/szerencsejatek-telegram-bot/SKILL.md` — domain and workflow hints.
- **Commands**: `.cursor/commands/` — e.g. `/implement-milestone`, `/review-iteration`,
  `/spec-new-lottery-game`, `/security-review`.
- **Templates**: `docs/templates/` — feature specs and ADRs.

## Prerequisites

- [Deno](https://deno.land/) **2.7.7** (Dockerfile and CI pin; use the same locally for fewer
  surprises).

## CI

GitHub Actions (`.github/workflows/`):

| Workflow                                       | When                                                                                  | What                                                                       |
| ---------------------------------------------- | ------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| [ci.yml](.github/workflows/ci.yml)             | PRs and pushes to `main`                                                              | `deno task check`, Helm lint, Docker build                                 |
| [e2e-kind.yml](.github/workflows/e2e-kind.yml) | PRs/pushes when `deploy/`, `scripts/kind-e2e.sh`, `tests/e2e/`, or `deno.json` change | Full `deno task test:e2e` (kind + Helm smoke)                              |
| [publish.yml](.github/workflows/publish.yml)   | Tag `v*.*.*` or **workflow dispatch** (semver)                                        | Push image + Helm chart (OCI) to **GHCR** (`packages: write` on this repo) |

In **Settings → Rules → Rulesets** (or branch protection), require the **Check** job from `CI` as a
status check; add **e2e** from `e2e-kind` if you want the cluster smoke test mandatory for those
paths.

[Dependabot](.github/dependabot.yml) opens weekly PRs to bump GitHub Actions versions.

## Setup

1. Copy `.env.example` to `.env` and set `BOT_TOKEN` (from [@BotFather](https://t.me/BotFather)).
   `DATABASE_URL` supports:
   - SQLite/libSQL (`file:`, `libsql:`, `https:`, `wss:`)
   - PostgreSQL (`postgres://` or `postgresql://`, including Deno Deploy provisioned Postgres)
2. Run format/lint/test:

```bash
deno task check
```

This runs unit tests under `src/` and application e2e under `tests/e2e` (Ötöslottó pipeline with a
temporary SQLite file, e.g. winning numbers `1,2,3,4,5`).

### Optional: kind + Helm smoke

Needs Docker, `kind`, `kubectl`, Helm, and outbound HTTPS for Knative CRD URLs. Runs
`deno task test:e2e` — see [deploy/kind/README.md](deploy/kind/README.md). The script installs the
chart with **`workload.mode=httpServer`** (single `server.ts` pod; no `BOT_TOKEN` required for
smoke). Deno-only wrapper: `E2E_KIND=1 deno task test:integration`.

### Optional: kind + real Telegram (long polling)

To run the bot **in a local kind cluster** with **`BOT_TOKEN` from `.env`** (outbound HTTPS to
Telegram; no public URL needed), use **`deno task kind:telegram`**
(`scripts/kind-telegram-local.sh`). The cluster is **not** deleted when the script exits. Details
and env vars (**`CRONJOB_ENABLED`**, etc.):
[deploy/kind/README.md](deploy/kind/README.md#local-telegram-testing-in-kind).

### Local HTTP server (`deno task dev`)

CloudEvents `POST /`, Telegram webhook `POST …/telegram/webhook` when `BOT_TOKEN` is set, health
`GET /` or `GET /healthz`:

```bash
deno task dev
```

**Knative / webhook (scale-to-zero):** set **`WEBHOOK_URL`** (public **HTTPS**, no trailing slash),
optionally **`TELEGRAM_WEBHOOK_SECRET`**, and **`BOT_TOKEN`**. `server.ts` calls **`setWebhook`** at
startup. Default webhook path: **`/telegram/webhook`** (`TELEGRAM_WEBHOOK_PATH`). Set
**`TELEGRAM_BACKGROUND_INIT=true`** to start HTTP health endpoints first and initialize grammY in
the background (useful when hosting platforms fail warmup if startup blocks on external Telegram API
calls). In background mode, `GET /healthz` returns **503** until Telegram runtime is ready and
failed init attempts are retried with backoff. Set **`CRON_RESULT_CHECK_ENABLED=true`** to register
an in-process **Deno Cron** hourly draw check (disabled by default).

### Production (Helm)

Default chart values: **`workload.mode: longPolling`** — **`telegram_bot.ts`** (long polling) +
**`server.ts`** on **ClusterIP** only (**`ingress.enabled: false`**); optional **CronJob** (default
on) posts **`scripts/check_draw_result.ts`** to **`server.ts`** on a schedule — also available for
**`httpServer`** and **`knative.enabled: true`** when **`cronjob.enabled`**. See
[deploy/helm/szerencsejatek-telegram-bot/README.md](deploy/helm/szerencsejatek-telegram-bot/README.md)
and [deploy/README.md](deploy/README.md). For public webhook or Knative, use **`httpServer`** or
**`knative.enabled: true`** and set **`config.webhookUrl`** / ingress as documented there.

### Local Telegram (long polling)

[docs/local-telegram-testing.md](docs/local-telegram-testing.md) — `deno task bot` (clears webhook
first). Do not run `bot` and a **local** `server.ts` with **`WEBHOOK_URL`** on the **same** token at
once. The **Helm** long-polling Pod is an exception: two containers share one token by design (one
polls, one serves internal HTTP only) — see [docs/architecture.md](docs/architecture.md) §5.

### Knative on kind (manual)

Build the container, create a **kind** cluster, install **Knative Serving** + **Kourier** and
optional **Eventing**, then apply the manifests or use the Helm **`knative.enabled: true`** path.
Step-by-step: [deploy/kind/README.md](deploy/kind/README.md).

```bash
docker build -f deploy/docker/Dockerfile -t dev.local/szerencsejatek-bot:latest .
```

## Legal note

This project is an independent tool. It does **not** place bets on behalf of users. Verify terms of
use for any **official or third-party data source** before production automation.

## License

Apache-2.0 — see [LICENSE](LICENSE).
