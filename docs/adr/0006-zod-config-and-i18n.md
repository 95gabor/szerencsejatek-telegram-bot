# ADR 0006: Environment validation (Zod) and internationalization

## Status

Accepted

## Context

Production configuration must be **validated at startup** (fail fast) with **typed** access.
User-facing strings must not be scattered in handlers—**locale-specific copy** belongs in one place
to avoid drift and to support future locales.

## Alternatives considered

### Configuration validation

| Option                           | Summary                                                                                                                 |
| -------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| **Manual `Deno.env.get` + `if`** | No extra dependency; **error-prone** and **no** single schema for URLs, defaults, or coercion.                          |
| **Joi**                          | Mature; **schema-first** API; common in Node; heavier bundle and less idiomatic TS inference than Zod in this codebase. |
| **Valibot**                      | Smaller; good for edge runtimes; **newer** ecosystem; Zod was chosen for familiarity and TS inference patterns.         |
| **Zod**                          | **TypeScript-first** inference from `safeParse`; `coerce`, `preprocess`, defaults; works with `npm:zod` on Deno.        |

### Internationalization

| Option                                                       | Summary                                                                                                                         |
| ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------- |
| **Inline strings in handlers**                               | Fast to start; **no** reuse between Telegram and pipeline notifications; hard to translate.                                     |
| **Full i18n framework** (e.g. **i18next** with file loaders) | Powerful for large apps; **overkill** for one primary locale (`hu`) and a small key set.                                        |
| **Per-locale message maps + `t()`**                          | **Keys** in `src/i18n/locales/`; `t(locale, key, params)`; domain stays **non-localized** (reason codes); adapters map to text. |

## Decision

1. **`src/config/env.ts`**: **`@std/dotenv`** `loadSync({ export: true })` loads `./.env` into
   `Deno.env` when the file exists (existing process env wins). Then validate with **Zod**
   (`safeParse`); on failure log `flatten()` and **`Deno.exit(1)`**. Export inferred **`AppConfig`**
   type.
2. **`src/i18n/`**: `Locale` union (currently **`hu`**); `locales/hu.ts` holds `as const` strings;
   **`translate.ts`** interpolates `{{param}}` placeholders; domain errors use **typed reasons**
   (e.g. `InvalidOtoslottoLineError`) and Telegram maps them via
   **`translateInvalidOtoslottoLine`**.
3. **`DEFAULT_LOCALE`** env (default `hu`) threads through pipeline deps and grammY handlers.

## Dependencies

Pinned in `deno.json` imports:

| Package           | Version   | Role                                                                  |
| ----------------- | --------- | --------------------------------------------------------------------- |
| `jsr:@std/dotenv` | `0.225.6` | Load `./.env` into `Deno.env` before Zod parse (`loadSync` + export). |
| `npm:zod`         | `3.24.2`  | `z.object` schema for env; `z.infer` for `AppConfig`.                 |

## Review

| Field       | Value                                                                |
| ----------- | -------------------------------------------------------------------- |
| Approved by | (reviewer name or handle — after explicit approval of this ADR text) |
| Approved at | `YYYY-MM-DDTHH:mm:ssZ` (UTC — when approval was given)               |

## Consequences

- **Positive**: Single schema for env; compile-time-friendly config type; user copy centralized.
- **Negative**: Add new keys to locale files when adding flows; **no** pluralization library yet
  (acceptable for v1 Hungarian).
- **Follow-up**: Extend `Locale` and add `locales/*.ts` when a second language is required.
