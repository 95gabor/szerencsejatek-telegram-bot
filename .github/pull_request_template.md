## Summary

<!-- What changed and why? Link issues: Fixes # -->

## Test plan

- [ ] `deno task check`
- [ ] If deploy/Helm changed: `deno task test:e2e` (Docker, kind, kubectl, Helm)

## Checklist

- [ ] Docs or ADRs updated if behavior, config, or public HTTP/Telegram contract changed
- [ ] No secrets or real tokens in commits (use `.env` locally; chart Secrets in cluster only)
