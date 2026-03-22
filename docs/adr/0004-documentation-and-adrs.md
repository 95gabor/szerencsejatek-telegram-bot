# ADR 0004: Documentation and ADR policy

## Status

Accepted

## Context

Contributors and AI agents need a **single source of truth** for behaviour and **traceability** for
architectural choices. Drift between code and docs causes wrong assumptions and bad refactors.

## Alternatives considered

| Option                                       | Summary                                                                                                                                                                           |
| -------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **README + commits only**                    | **Low ceremony**; **no** durable “why” beyond git history — hard for newcomers and agents to find **intent** without spelunking diffs.                                            |
| **Architecture doc only**                    | One long `architecture.md` — good overview; **no** per-decision history or **supersession** when the stack changes (e.g. ORM swap).                                               |
| **External wiki** (Confluence, Notion, etc.) | Search and rich editing — **outside the repo**: access control, **link rot**, and **version skew** with the branch that ships code.                                               |
| **RFC / design review process**              | Strong for large teams — **heavy** for a small OSS repo; can still **reference** ADRs from RFCs if the org grows.                                                                 |
| **CHANGELOG as decision log**                | Great for **user-visible** releases — **not** a substitute for **design rationale** (often omitted or compressed).                                                                |
| **Repo ADRs (Nygard-style)**                 | Short markdown in **`docs/adr/`**, versioned with code — **traceable**, reviewable in PRs, works **offline** and for **agents**; optional link-out to external tools when needed. |

## Decision

1. After **meaningful code changes**, update **at least one** of: `docs/architecture.md`,
   `docs/requirements.md`, `docs/design-plan.md`, or `README.md` when user-facing or structural
   behaviour shifts.
2. Add or amend an **ADR** in `docs/adr/` when the change is a **durable decision** (stack, event
   model, deployment shape, security boundary). Use the next free number and link it from
   `docs/adr/README.md`.
3. Keep **`AGENTS.md`** aligned with automation expectations (pipeline, review, comment policy).
4. **Human approval before recording architecture ADRs (agents and contributors):** When an
   architecture change warrants a **new ADR** or a **material amendment** to an existing ADR (new
   sections, changed decision, or supersession), **ask the user or maintainer** whether they approve
   documenting the decision that way. **Do not** add or change the **Review** block (see below) with
   a reviewer name or **Approved at** timestamp **without** that explicit approval. If the user
   **declines** or defers, update `docs/architecture.md` (and related docs) but leave the ADR
   unchanged or add a **Proposed** ADR only if the project uses that status.
5. **On approval:** Add or update the **Review** section at the end of the ADR with **Approved by:**
   the **reviewer’s name or handle** exactly as the approver provides, and **Approved at:** an **ISO
   8601 UTC timestamp** (e.g. `2025-03-22T14:30:00Z`) for when the approval was given. Never invent
   a reviewer name or timestamp.
6. **New runtime dependency** (e.g. `npm:` / `jsr:` in `deno.json` import map or pinned in `src/`):
   **Agents and contributors must** record **package name and pinned version** in the **same change
   set** as the code: either amend an existing ADR’s **Dependencies** section or add a **new ADR**
   (with **Alternatives considered** when the choice is non-obvious), then update
   `docs/adr/README.md` (**Dependency inventory** and index). Follow the **approval** rules in §4–5
   when the ADR is new or materially amended.

## Review

| Field       | Value                                                                   |
| ----------- | ----------------------------------------------------------------------- |
| Approved by | (reviewer name or handle — after explicit approval of this policy text) |
| Approved at | `YYYY-MM-DDTHH:mm:ssZ` (UTC — when approval was given)                  |

## Consequences

- **Positive**: Reviewable history; onboarding and agents stay accurate; approvals tie decisions to
  a named reviewer and **point in time** when required.
- **Negative**: Small overhead per change; prefer thin ADRs over long essays; one extra step before
  merging ADR text for architectural moves.
- **Follow-up**: Optional **CI** check that touched `src/` also touches `docs/` (heuristic only).
