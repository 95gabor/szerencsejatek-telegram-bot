# Contributing

Contributions are welcome. Changes go through **pull requests** and **review** before merge into
`main`.

## Getting started

1. **Fork** the repository and **clone** your fork.
2. Create a **branch** from `main` (`feat/…`, `fix/…`, or `docs/…`).
3. Copy **`.env.example`** to **`.env`** and set `BOT_TOKEN` (and any other vars) for local runs —
   never commit `.env`.
4. Run checks before opening a PR:

   ```bash
   deno task check
   ```

   If you change Helm or `deploy/`, also run `deno task helm:lint` (included in `check`) and, when
   possible, `deno task test:e2e` (Docker, kind, Helm smoke).

5. Open a **pull request** against `main` with a clear description and test notes.

## Pull requests

- Prefer **small, focused** PRs with a single logical change when practical.
- Use **Conventional Commit format** for PR titles: `type(scope?): subject` (e.g.
  `feat(cron): add optional hourly in-process result check`).
- Fill in the **[pull request template](.github/pull_request_template.md)** (summary, test plan).
- **Do not** commit secrets, real bot tokens, or private URLs with credentials. CI and reviewers
  will reject or revert such changes.
- Match existing **style**: `deno fmt`, `deno lint`, TypeScript strictness, patterns in `src/`.

## Review and merge policy

The maintainer(s) **review and approve** PRs before merge. External contributors typically work from
**forks**; only maintainers merge to `main`.

### Maintainer: GitHub settings before / after going public

To require your review on every change:

1. **Settings → Rules → Rulesets** (or **Branches → Branch protection rules**) for `main`:
   - Require a pull request before merging.
   - Require approvals: **1** (or more).
   - Optionally: **Dismiss stale pull request approvals** when new commits are pushed.
   - Require status checks to pass: **`Check`** (from `.github/workflows/ci.yml`).
2. **Settings → Actions → General → Fork pull request workflows** — choose whether workflows from
   forks need approval (recommended for first-time contributors).
3. Enable **private vulnerability reporting**: **Settings → Security** → enable “Private
   vulnerability reporting” so `SECURITY.md` can be used responsibly.

`CODEOWNERS` requests reviews from the listed owners when PRs touch the repo; combine with branch
protection so merges still need your approval.

## License

By contributing, you agree that your contributions are licensed under the same terms as the project
— **Apache-2.0** (see [LICENSE](LICENSE)).
