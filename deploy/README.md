# Deployment

| Guide                                                                           | Description                                                                                                                                                                            |
| ------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [helm/szerencsejatek-telegram-bot/](helm/szerencsejatek-telegram-bot/README.md) | **Helm** (recommended): default **long polling** + internal **`server.ts`** (**ClusterIP**); optional **CronJob** → `check_draw_result.ts` (all workload modes + Knative when enabled) |
| [kind/README.md](kind/README.md)                                                | **kind**: e2e smoke (`kind-e2e.sh`), **local Telegram** (`kind-telegram-local.sh` / `deno task kind:telegram`), Knative manual install                                                 |

**Dockerfile:** [docker/Dockerfile](docker/Dockerfile) — copies `src/` and `scripts/` (CronJob uses
`check_draw_result.ts`). Deno runs with **`--allow-sys`** in the image CMD and Helm commands
(required for **libsql** native load in containers).

**Raw Knative YAML** (reference): [knative/](knative/) — prefer **Helm** for installs; chart can
render a Knative Service when **`knative.enabled: true`**.

**CI / GHCR:** [`.github/workflows/publish.yml`](../.github/workflows/publish.yml) pushes the image
and OCI chart to **`ghcr.io/95gabor/...`** (see chart README).
