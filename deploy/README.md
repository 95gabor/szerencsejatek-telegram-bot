# Deployment

| Guide                                                                           | Description                                                                                                                                         |
| ------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| [helm/szerencsejatek-telegram-bot/](helm/szerencsejatek-telegram-bot/README.md) | **Helm** (recommended): default **long polling** + internal **`server.ts`** (**ClusterIP**), hourly **CronJob**; optional **Ingress** / **Knative** |
| [kind/README.md](kind/README.md)                                                | **kind** cluster, **Knative Serving** + **Kourier**, **Eventing** (Broker, Trigger), Docker image — manual path                                     |

**Dockerfile:** [docker/Dockerfile](docker/Dockerfile) — copies `src/` and `scripts/` (CronJob uses
`check_draw_result.ts`).

**Raw Knative YAML** (reference): [knative/](knative/) — prefer **Helm** for installs; chart can
render a Knative Service when **`knative.enabled: true`**.

**CI / GHCR:** [`.github/workflows/publish.yml`](../.github/workflows/publish.yml) pushes the image
and OCI chart to **`ghcr.io/95gabor/...`** (see chart README).
