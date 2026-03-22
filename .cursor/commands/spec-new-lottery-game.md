The user wants to add support for another Szerencsejáték lottery game.

1. Open `docs/requirements.md` and list what you need: number ranges, count of numbers per line,
   draw frequency, extra numbers (e.g. Joker), and official result fields.
2. Propose a **minimal schema** for storing user lines and for normalizing draw results (see
   `docs/architecture.md`).
3. Describe **match rules** (hits only vs prize tiers) and which part is MVP.
4. Output a short **addendum** section in markdown the user can paste into `docs/requirements.md`,
   plus any new env vars or cron schedule changes.

Do not write implementation code until the user confirms the addendum.
