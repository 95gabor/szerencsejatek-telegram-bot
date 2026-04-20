# Helm chart: `szerencsejatek-telegram-bot`

Deploys the app as either:

- **Default:** `knative.enabled: false`, `workload.mode: longPolling`, `ingress.enabled: false` —
  **`telegram_bot.ts`** (long polling) + **`server.ts`** (internal HTTP for CloudEvents only,
  **ClusterIP**); **CronJob** triggers draw checks hourly (`cronjob.schedule`, default `0 * * * *`).
- **`workload.mode: httpServer`:** single **`server.ts`** Deployment (webhook / CloudEvents); add
  **`ingress`** if you need public HTTP. **CronJob** (optional, `cronjob.enabled`) can trigger draw
  checks the same way as in long polling.
- **`knative.enabled: true`:** Knative Service — scale-to-zero, webhook + CloudEvents `POST /`.
  Optional **CronJob** (`cronjob.enabled`) POSTs draw checks to the same in-cluster Service name as
  the Knative Service.

## Prerequisites

- Container image built from **`deploy/docker/Dockerfile`** and pushed to a registry your cluster
  can pull.
- **Telegram** `BOT_TOKEN` (from [@BotFather](https://t.me/BotFather)).
- For Knative: cluster with **Knative Serving** (and optionally **Eventing** if you enable the
  Broker/Trigger).

## Quick install (default: long polling + internal pipeline, no ingress)

```bash
helm upgrade --install szerencsejatek-bot ./deploy/helm/szerencsejatek-telegram-bot \
  --namespace default \
  --set image.repository=ghcr.io/95gabor/szerencsejatek-telegram-bot \
  --set image.tag=0.2.0 \
  --set telegram.existingSecret=telegram-bot
```

**Webhook / Knative** (public HTTPS) — set `workload.mode: httpServer` or `knative.enabled: true`
and configure `config.webhookUrl` / ingress as needed.

```bash
helm upgrade --install szerencsejatek-bot ./deploy/helm/szerencsejatek-telegram-bot \
  --namespace default \
  --set image.repository=ghcr.io/95gabor/szerencsejatek-telegram-bot \
  --set image.tag=0.2.0 \
  --set workload.mode=httpServer \
  --set ingress.enabled=true \
  --set telegram.existingSecret=telegram-bot \
  --set config.webhookUrl=https://your-public-host.example.com
```

Create the secret first:

```bash
kubectl create secret generic telegram-bot --from-literal=token='YOUR_BOT_TOKEN'
```

## Install from GHCR (OCI chart)

Releases published by [`.github/workflows/publish.yml`](../../../.github/workflows/publish.yml) push
the chart to `oci://ghcr.io/95gabor/szerencsejatek-telegram-bot/helm-charts` (GitHub Container
Registry). Authenticate if the package is private:

```bash
echo "$GITHUB_TOKEN" | helm registry login ghcr.io -u YOUR_GH_USERNAME --password-stdin
helm install szerencsejatek-demo oci://ghcr.io/95gabor/szerencsejatek-telegram-bot/helm-charts/szerencsejatek-telegram-bot \
  --version 0.2.0 \
  --namespace default \
  --set image.repository=ghcr.io/95gabor/szerencsejatek-telegram-bot \
  --set image.tag=0.2.0 \
  --set telegram.existingSecret=telegram-bot
```

Use the **same semver** for `--version` and `image.tag` as the release you installed.

## Values (overview)

| Area                  | Keys                                                                                                                     |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| Image                 | `image.repository`, `image.tag`, `image.pullPolicy`                                                                      |
| Workload              | `knative.enabled`, `workload.mode` (`longPolling` \| `httpServer`), `deployment.*`                                       |
| CronJob               | `cronjob.enabled`, `cronjob.schedule`, `cronjob.suspend` (POSTs to in-cluster `server.ts` URL)                           |
| Telegram              | `telegram.existingSecret`, `telegram.botToken`, `config.webhookUrl`, `telegramWebhook.existingSecret`                    |
| App                   | `config.gameId`, `config.logFormat`, `config.otel.*`, `config.otoslottoResultJsonUrl`, `config.eurojackpotResultJsonUrl` |
| Storage               | `persistence.enabled`, `persistence.size`, `persistence.storageClass`                                                    |
| Eventing              | `eventing.enabled`, `eventing.brokerName`                                                                                |
| Ingress (non-Knative) | `ingress.enabled`, `ingress.hosts`                                                                                       |

See **`values.yaml`** for defaults and comments.

## Optional: Knative Broker + Trigger

Set `eventing.enabled: true` to install a `Broker` and `Trigger` that deliver CloudEvents to this
Knative Service (same as `deploy/knative/broker.yaml` / `trigger.yaml`).

## Lint / render

```bash
helm lint deploy/helm/szerencsejatek-telegram-bot
helm template demo deploy/helm/szerencsejatek-telegram-bot \
  --set telegram.botToken=dummy \
  --set config.webhookUrl=https://example.com
```
