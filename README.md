# Szerencsejáték Telegram bot

Telegram bot (**TypeScript / Deno**) for players of
[Szerencsejáték Zrt.](https://www.szerencsejatek.hu/) games: users **save the numbers they played**,
and when **official results** are available the bot **notifies** them with the winning numbers and
**whether their lines matched**.

**Repository:**
[github.com/95gabor/szerencsejatek-telegram-bot](https://github.com/95gabor/szerencsejatek-telegram-bot)

## Documentation

| Document                                                         | Purpose                                                                        |
| ---------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| [docs/requirements.md](docs/requirements.md)                     | Functional/non-functional requirements and **open questions**                  |
| [docs/architecture.md](docs/architecture.md)                     | Components, data flow, deployment notes                                        |
| [deploy/kind/README.md](deploy/kind/README.md)                   | **kind** + **Knative** (Serving, Eventing, CloudEvents HTTP)                   |
| [docs/design-plan.md](docs/design-plan.md)                       | Phased delivery and risks                                                      |
| [docs/adr/README.md](docs/adr/README.md)                         | Architecture decision records (ADRs)                                           |
| [docs/local-telegram-testing.md](docs/local-telegram-testing.md) | **Local dev with a real Telegram bot** (long polling, optional webhook tunnel) |
| [AGENTS.md](AGENTS.md)                                           | Short agent / contributor context                                              |

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
2. Run format/lint/test:

```bash
deno task check
```

This runs unit tests under `src/` and application e2e under `tests/e2e` (Ötöslottó pipeline with a
temporary SQLite file, e.g. winning numbers `1,2,3,4,5`).

**kind e2e** (optional, needs Docker + `kind` + `kubectl` + network for CRDs): `deno task test:e2e`
— see [deploy/kind/README.md](deploy/kind/README.md). Deno wrapper:
`E2E_KIND=1 deno task test:integration`.

1. Run the **HTTP server** (CloudEvents `POST /`, Telegram webhook `POST …/telegram/webhook` when
   `BOT_TOKEN` is set, health `GET /` or `GET /healthz`):

```bash
deno task dev
```

**Knative / scale-to-zero:** set `**WEBHOOK_URL`** to your public **HTTPS** URL (no trailing slash),
optionally `**TELEGRAM_WEBHOOK_SECRET**`, and `**BOT_TOKEN**`. On startup, `server.ts` calls
`**setWebhook**` so Telegram pushes updates — no long polling, so the revision can **scale to zero**
when idle. Default webhook path: `**/telegram/webhook`** (`TELEGRAM_WEBHOOK_PATH`).

**Local dev with a real bot (long polling, troubleshooting):**
[docs/local-telegram-testing.md](docs/local-telegram-testing.md). Quick start: `deno task bot`
(clears webhook first). Do not run `bot` and `server` with the same token at once.

### Knative on kind

Build the container, create a **kind** cluster, install **Knative Serving** + **Kourier** and
optional **Eventing**, then apply the manifests. Step-by-step:
[deploy/kind/README.md](deploy/kind/README.md).

```bash
docker build -f deploy/docker/Dockerfile -t dev.local/szerencsejatek-bot:latest .
```

## Legal note

This project is an independent tool. It does **not** place bets on behalf of users. Verify terms of
use for any **official or third-party data source** before production automation.

## License

Apache-2.0 — see [LICENSE](LICENSE).
