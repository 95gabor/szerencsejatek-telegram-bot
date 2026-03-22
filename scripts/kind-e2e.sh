#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

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

CLUSTER_NAME="${CLUSTER_NAME:-szerencsejatek-e2e}"
KNATIVE_SERVING_VERSION="${KNATIVE_SERVING_VERSION:-1.15.2}"
KNATIVE_EVENTING_VERSION="${KNATIVE_EVENTING_VERSION:-1.15.2}"

# Helm smoke: plain Deployment (no Knative Serving controller in this script)
HELM_RELEASE="${HELM_RELEASE:-szerencsejatek-e2e}"
E2E_IMAGE_REPO="${E2E_IMAGE_REPO:-dev.local/szerencsejatek-e2e}"
E2E_IMAGE_TAG="${E2E_IMAGE_TAG:-smoke}"
# Must match chart default fullnameOverride (deploy/helm/.../values.yaml)
E2E_DEPLOYMENT_NAME="${E2E_DEPLOYMENT_NAME:-szerencsejatek-bot}"

cleanup() {
  kind delete cluster --name "$CLUSTER_NAME" 2>/dev/null || true
}

trap cleanup EXIT INT TERM

echo "==> kind create cluster: $CLUSTER_NAME"
kind create cluster --name "$CLUSTER_NAME" --config "$ROOT/deploy/kind/kind-config.yaml"

echo "==> wait for nodes"
kubectl config use-context "kind-${CLUSTER_NAME}"
kubectl wait --for=condition=Ready nodes --all --timeout=120s

echo "==> install Knative CRDs (kubectl apply from upstream release URLs)"
kubectl apply -f \
  "https://github.com/knative/serving/releases/download/knative-v${KNATIVE_SERVING_VERSION}/serving-crds.yaml"
kubectl apply -f \
  "https://github.com/knative/eventing/releases/download/knative-v${KNATIVE_EVENTING_VERSION}/eventing-crds.yaml"

kubectl wait --for=condition=Established "crd/services.serving.knative.dev" --timeout=120s
kubectl wait --for=condition=Established "crd/brokers.eventing.knative.dev" --timeout=120s
kubectl wait --for=condition=Established "crd/triggers.eventing.knative.dev" --timeout=120s

echo "==> kubectl apply --dry-run=client (manifests)"
kubectl apply --dry-run=client -f "$ROOT/deploy/knative/service.yaml"
kubectl apply --dry-run=client -f "$ROOT/deploy/knative/broker.yaml"
kubectl apply --dry-run=client -f "$ROOT/deploy/knative/trigger.yaml"

echo "==> helm lint (chart)"
helm lint "$ROOT/deploy/helm/szerencsejatek-telegram-bot"

echo "==> docker build + kind load image: ${E2E_IMAGE_REPO}:${E2E_IMAGE_TAG}"
docker build -f "$ROOT/deploy/docker/Dockerfile" -t "${E2E_IMAGE_REPO}:${E2E_IMAGE_TAG}" "$ROOT"
kind load docker-image "${E2E_IMAGE_REPO}:${E2E_IMAGE_TAG}" --name "$CLUSTER_NAME"

echo "==> helm install ${HELM_RELEASE} (Deployment mode, --wait for ready)"
helm install "$HELM_RELEASE" "$ROOT/deploy/helm/szerencsejatek-telegram-bot" \
  --namespace default \
  --wait \
  --timeout 5m \
  --set knative.enabled=false \
  --set image.repository="$E2E_IMAGE_REPO" \
  --set image.tag="$E2E_IMAGE_TAG" \
  --set image.pullPolicy=Never

echo "==> wait for Deployment Available + Pods Ready"
kubectl wait --for=condition=Available "deployment/${E2E_DEPLOYMENT_NAME}" --timeout=180s
kubectl wait --for=condition=Ready pod \
  -l "app.kubernetes.io/instance=${HELM_RELEASE},app.kubernetes.io/name=szerencsejatek-telegram-bot" \
  --timeout=180s

echo "==> kind e2e smoke passed"
