#!/usr/bin/env bash
# Deploy the bot to a local kind cluster with Telegram long polling.
# Loads BOT_TOKEN from the repo root .env (does not print the token).
# The cluster is left running so you can chat with the bot; use --teardown to delete it.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

usage() {
  cat <<'EOF'
Usage: kind-telegram-local.sh [--teardown]

  (no args)     Create kind cluster if missing, build/load image, helm upgrade --install
                with workload.mode=longPolling and BOT_TOKEN from .env

  --teardown    Delete the kind cluster (CLUSTER_NAME) and exit

Environment (optional):
  CLUSTER_NAME          default: szerencsejatek-local
  HELM_RELEASE          default: szerencsejatek-local
  LOCAL_IMAGE_REPO      default: dev.local/szerencsejatek-telegram-bot
  LOCAL_IMAGE_TAG       default: local
  DEPLOYMENT_NAME       default: szerencsejatek-bot (must match chart fullnameOverride)
  CRONJOB_ENABLED       default: false (set to true to enable hourly draw CronJob)
EOF
}

if [[ "${1:-}" == "-h" ]] || [[ "${1:-}" == "--help" ]]; then
  usage
  exit 0
fi

if ! command -v kind >/dev/null 2>&1; then
  echo "kind not found — install: https://kind.sigs.k8s.io/docs/user/quick-start/#installation"
  exit 1
fi
if ! command -v kubectl >/dev/null 2>&1; then
  echo "kubectl not found"
  exit 1
fi
if ! command -v helm >/dev/null 2>&1; then
  echo "helm not found — install: https://helm.sh/docs/intro/install/"
  exit 1
fi
if ! command -v docker >/dev/null 2>&1; then
  echo "docker not found — required to build and load the image into kind"
  exit 1
fi

CLUSTER_NAME="${CLUSTER_NAME:-szerencsejatek-local}"
HELM_RELEASE="${HELM_RELEASE:-szerencsejatek-local}"
LOCAL_IMAGE_REPO="${LOCAL_IMAGE_REPO:-dev.local/szerencsejatek-telegram-bot}"
LOCAL_IMAGE_TAG="${LOCAL_IMAGE_TAG:-local}"
DEPLOYMENT_NAME="${DEPLOYMENT_NAME:-szerencsejatek-bot}"
CRONJOB_ENABLED="${CRONJOB_ENABLED:-true}"

if [[ "${1:-}" == "--teardown" ]]; then
  kind delete cluster --name "$CLUSTER_NAME" 2>/dev/null || true
  echo "Removed kind cluster: $CLUSTER_NAME"
  exit 0
fi

if [[ -n "${1:-}" ]]; then
  echo "Unknown option: $1"
  usage
  exit 1
fi

if [[ ! -f "$ROOT/.env" ]]; then
  echo "Missing $ROOT/.env — add BOT_TOKEN=... (see comments in .env)"
  exit 1
fi

set -a
# shellcheck disable=SC1091
source "$ROOT/.env"
set +a

if [[ -z "${BOT_TOKEN:-}" ]]; then
  echo "BOT_TOKEN is not set in .env"
  exit 1
fi

TOKEN_FILE="$(mktemp)"
cleanup_token() {
  rm -f "$TOKEN_FILE"
}
trap cleanup_token EXIT
printf '%s' "$BOT_TOKEN" > "$TOKEN_FILE"

echo "==> kind cluster: $CLUSTER_NAME"
if ! kind get clusters 2>/dev/null | grep -qx "$CLUSTER_NAME"; then
  kind create cluster --name "$CLUSTER_NAME" --config "$ROOT/deploy/kind/kind-config.yaml"
fi
kubectl config use-context "kind-${CLUSTER_NAME}"
kubectl wait --for=condition=Ready nodes --all --timeout=120s

echo "==> docker build + kind load: ${LOCAL_IMAGE_REPO}:${LOCAL_IMAGE_TAG}"
docker build -f "$ROOT/deploy/docker/Dockerfile" -t "${LOCAL_IMAGE_REPO}:${LOCAL_IMAGE_TAG}" "$ROOT"
kind load docker-image "${LOCAL_IMAGE_REPO}:${LOCAL_IMAGE_TAG}" --name "$CLUSTER_NAME"

echo "==> helm upgrade --install $HELM_RELEASE (longPolling, BOT_TOKEN from .env)"
helm upgrade --install "$HELM_RELEASE" "$ROOT/deploy/helm/szerencsejatek-telegram-bot" \
  --namespace default \
  --wait \
  --timeout 5m \
  --set knative.enabled=false \
  --set workload.mode=longPolling \
  --set cronjob.enabled="${CRONJOB_ENABLED}" \
  --set image.repository="$LOCAL_IMAGE_REPO" \
  --set image.tag="$LOCAL_IMAGE_TAG" \
  --set image.pullPolicy=Never \
  --set-file telegram.botToken="$TOKEN_FILE"

echo "==> wait for Deployment Available + Pods Ready"
kubectl wait --for=condition=Available "deployment/${DEPLOYMENT_NAME}" --timeout=180s
kubectl wait --for=condition=Ready pod \
  -l "app.kubernetes.io/instance=${HELM_RELEASE},app.kubernetes.io/name=szerencsejatek-telegram-bot" \
  --timeout=180s

echo ""
echo "Telegram long polling is active (outbound HTTPS to api.telegram.org). Open Telegram and message your bot."
echo "Logs (telegram container): kubectl logs -f deployment/${DEPLOYMENT_NAME} -n default -c telegram"
echo "Logs (pipeline / server):  kubectl logs -f deployment/${DEPLOYMENT_NAME} -n default -c pipeline"
echo "Remove cluster:              $0 --teardown   (or: kind delete cluster --name $CLUSTER_NAME)"
