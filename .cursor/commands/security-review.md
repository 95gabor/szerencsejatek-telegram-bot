Perform a focused security review of the current Szerencsejáték Telegram bot codebase.

Checklist:

1. **Secrets**: No tokens in source; `.env` / CI secrets only; webhook path secrets.
2. **Telegram**: Validate webhook updates; rate-limit or debounce expensive paths if applicable.
3. **Data**: PII (chat id, numbers) not logged raw; persistence path secured.
4. **Supply chain**: Deno lockfile and pinned imports where possible.
5. **Abuse**: Input validation on user-submitted numbers; max lines per user if documented.

Output: prioritized findings (Critical / High / Medium / Low) with file references and concrete
fixes.

If you make any code changes while remediating findings, always run `deno task check` (fmt + lint +
tests) before finalizing.
