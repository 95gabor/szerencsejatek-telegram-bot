# kind + Knative (Serving + Eventing)

Run the bot as a **Knative Service** that accepts **CloudEvents over HTTP** (`POST /`). Knative
Eventing can deliver events from a **Broker** to this service via a **Trigger**.

Versions in the commands below are **examples** — pin to the
[current Knative release](https://github.com/knative/serving/releases) for production.

## Automated e2e (temporary cluster)

Creates a **throwaway** kind cluster, applies **Knative Serving + Eventing CRDs** from GitHub
release URLs (so `kubectl` can map `serving.knative.dev` / `eventing.knative.dev` kinds), then runs
`kubectl apply --dry-run=client` on `deploy/knative/*.yaml`. It then **lints** the Helm chart,
**builds** the app image (`deploy/docker/Dockerfile`), **loads** it into kind, runs
**`helm install`** in **Deployment** mode (`knative.enabled=false` — no Knative Serving controller
in this script), and waits until the workload is **healthy** (`helm --wait`, then `kubectl wait` for
Deployment Available and Pod Ready). The cluster is **always** deleted (`trap` on `EXIT` / `INT` /
`TERM`).

**Requirements:** `bash`, `kind`, `kubectl`, **Helm 3**, **Docker** (daemon running), and outbound
HTTPS for CRD YAMLs.

**Versions** (override if needed): `KNATIVE_SERVING_VERSION`, `KNATIVE_EVENTING_VERSION` (default
`1.15.2`).

**Helm smoke env** (optional): `HELM_RELEASE` (default `szerencsejatek-e2e`), `E2E_IMAGE_REPO` /
`E2E_IMAGE_TAG` (default `dev.local/szerencsejatek-e2e` / `smoke`), `E2E_DEPLOYMENT_NAME` (must
match chart `fullnameOverride`, default `szerencsejatek-bot`).

If kind fails with **host port 8080 already in use**, edit `hostPort` in
[`kind-config.yaml`](kind-config.yaml) or free that port.

```bash
deno task test:e2e
```

Same script: `scripts/kind-e2e.sh`. Override cluster name:
`CLUSTER_NAME=my-test deno task test:e2e`.

**Deno integration test** (registers **only** when `E2E_KIND=1`):

```bash
E2E_KIND=1 deno task test:integration
```

CI: [`.github/workflows/e2e-kind.yml`](../../.github/workflows/e2e-kind.yml) runs
`deno task test:e2e`.

## 1. Create a kind cluster

```bash
kind create cluster --name knative --config deploy/kind/kind-config.yaml
kubectl cluster-info --context kind-knative
```

## 2. Install Knative Serving + Kourier

```bash
export KNATIVE_SERVING_VERSION=1.15.2

kubectl apply -f "https://github.com/knative/serving/releases/download/knative-v${KNATIVE_SERVING_VERSION}/serving-crds.yaml"
kubectl apply -f "https://github.com/knative/serving/releases/download/knative-v${KNATIVE_SERVING_VERSION}/serving-core.yaml"

export KNATIVE_NET_KOURIER_VERSION=1.15.2
kubectl apply -f "https://github.com/knative/net-kourier/releases/download/knative-v${KNATIVE_NET_KOURIER_VERSION}/kourier.yaml"

kubectl patch configmap/config-network \
  --namespace knative-serving \
  --type merge \
  --patch '{"data":{"ingress.class":"kourier.ingress.networking.knative.dev"}}'

kubectl --namespace kourier-system wait deployment net-kourier-controller --for=condition=Available --timeout=120s
```

**Optional — Knative Operator via Helm:** you can install the
[official Operator chart](https://knative.github.io/operator)
(`helm repo add knative-operator https://knative.github.io/operator`) and manage Serving/Eventing
with Operator CRs instead of raw YAML; see
[Knative docs](https://knative.dev/docs/install/operator/knative-with-operators/).

## 3. Install Knative Eventing (Broker + Trigger)

```bash
export KNATIVE_EVENTING_VERSION=1.15.2

kubectl apply -f "https://github.com/knative/eventing/releases/download/knative-v${KNATIVE_EVENTING_VERSION}/eventing-crds.yaml"
kubectl apply -f "https://github.com/knative/eventing/releases/download/knative-v${KNATIVE_EVENTING_VERSION}/eventing-core.yaml"
kubectl apply -f "https://github.com/knative/eventing/releases/download/knative-v${KNATIVE_EVENTING_VERSION}/in-memory-channel.yaml"
kubectl apply -f "https://github.com/knative/eventing/releases/download/knative-v${KNATIVE_EVENTING_VERSION}/mt-channel-broker.yaml"

kubectl wait pods -n knative-eventing -l app=eventing-controller --for=condition=Ready --timeout=120s
```

## 4. Build and load the image into kind

From the **repository root**:

```bash
docker build -f deploy/docker/Dockerfile -t dev.local/szerencsejatek-bot:latest .
kind load docker-image dev.local/szerencsejatek-bot:latest --name knative
```

## 5. Deploy the Knative Service

```bash
kubectl apply -f deploy/knative/service.yaml
kubectl wait ksvc szerencsejatek-bot -n default --for=condition=Ready --timeout=180s
kubectl get ksvc szerencsejatek-bot -o wide
```

## 6. Broker + Trigger (deliver CloudEvents to the Service)

```bash
kubectl apply -f deploy/knative/broker.yaml
kubectl wait broker default -n default --for=condition=Ready --timeout=120s
kubectl apply -f deploy/knative/trigger.yaml
```

The **Trigger** sends matching events from the `default` Broker to the `szerencsejatek-bot` Knative
Service. The app handles **structured** (`application/cloudevents+json`) and **binary** (HTTP
headers) bindings via the official `cloudevents` SDK.

## 7. Send a test CloudEvent (direct to the Service)

Resolve the Service URL, then POST a structured event (adjust host/URL from `kubectl get ksvc`):

```bash
URL=$(kubectl get ksvc szerencsejatek-bot -o jsonpath='{.status.url}')
curl -sv -X POST "${URL}" \
  -H "Content-Type: application/cloudevents+json" \
  -d '{
    "specversion":"1.0",
    "id":"manual-1",
    "source":"https://example.com/manual",
    "type":"dev.szerencsejatek.telegram.otoslotto.draw.update.requested.v1",
    "datacontenttype":"application/json",
    "data":{"gameId":"otoslotto"}
  }'
```

Expect **204** if the event was accepted and dispatched. If the Ötöslottó JSON feed returns a new
draw, it is persisted and subscribers notified (same as production).

## Notes

- **Outbound messaging** uses `NoopOutboundNotifier` in `src/server.ts` until you wire Telegram (or
  another `OutboundNotifier`).
- **Draw ingestion** uses **`BetHuOtoslottoFetcher`** (operator public JSON — see
  `OTOSLOTTO_RESULT_JSON_URL`).
- **Persistence** uses SQLite at `DATABASE_URL` (default `file:/data/app.db` in the manifest with an
  `emptyDir` volume).
- For **TLS** and **custom domains**, follow
  [Knative networking docs](https://knative.dev/docs/serving/).
