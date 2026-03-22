# Deployment

| Guide                                                                           | Description                                                                                       |
| ------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| [kind/README.md](kind/README.md)                                                | **kind** cluster, **Knative Serving** + **Kourier**, **Eventing** (Broker, Trigger), Docker image |
| [helm/szerencsejatek-telegram-bot/](helm/szerencsejatek-telegram-bot/README.md) | **Helm chart** — Knative Service or Deployment, secrets, optional Broker/Trigger                  |

Dockerfile: [docker/Dockerfile](docker/Dockerfile). Knative manifests: [knative/](knative/)
(reference; prefer Helm for installs).
