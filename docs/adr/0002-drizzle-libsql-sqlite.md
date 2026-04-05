# ADR 0002: Drizzle ORM persistence (libSQL/SQLite and PostgreSQL)

## Status

Accepted

## Context

We need durable storage for users, played lines, and draws with **migrations-friendly** schema and
**TypeScript-first** ergonomics. Raw SQL only was rejected for maintainability.

## Alternatives considered

| Option       | Summary                                                                                                                                                                                                                                                                      |
| ------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Prisma**   | Schema + generated client; strong migrations and ecosystem; heavier **codegen** and runtime; **Deno** is supported via npm but not the primary platform; SQLite/libSQL work, yet the team preferred a **lighter** in-process model without a generated client for this repo. |
| **TypeORM**  | Decorator-based **Data Mapper / Active Record**; large API; **Deno** support is not first-class; more ceremony than needed for a small schema.                                                                                                                               |
| **MikroORM** | **Unit of Work**, identity map, rich features for complex object graphs; **heavier** operational model than this service requires.                                                                                                                                           |
| **Kysely**   | Excellent **type-safe SQL builder**; minimal runtime; no bundled **schema + migrations** story comparable to Drizzle Kit in one package; **closest** philosophically—could replace Drizzle’s query layer if we stayed SQL-first.                                             |
| **Drizzle**  | **Schema as TypeScript**, SQL-like API, **official libSQL dialect**, works with `npm:` in Deno; small surface area; **drizzle-kit** for migrations when needed.                                                                                                              |

**Why not Kysely alone?** Kysely is a strong pick for query building only; we wanted **schema
definitions** and **migration tooling** aligned with the same stack, and Drizzle’s **libSQL**
integration is a documented path for this deployment (file DB now, remote libSQL later).

## Decision

Use **Drizzle ORM** as the shared persistence/query layer, with runtime backend selected from
`DATABASE_URL`:

- `file:`, `libsql:`, `https:`, `wss:` -> libSQL adapter (`@libsql/client`) and schema in
  `src/adapters/persistence/drizzle/schema.ts`
- `postgres://`, `postgresql://` -> PostgreSQL adapter (`postgres` + Drizzle `postgres-js`) and
  schema in `src/adapters/persistence/drizzle_postgres/schema.ts`

`server.ts` and `telegram_bot.ts` use one persistence factory that picks backend from URL scheme.
Idempotent draw insert continues to use `INSERT ... ON CONFLICT DO NOTHING` with `RETURNING`.

## Dependencies

Pinned in source imports (see also `deno.lock`):

| Package              | Version                  | Role                                                                                          |
| -------------------- | ------------------------ | --------------------------------------------------------------------------------------------- |
| `npm:drizzle-orm`    | `0.45.1`                 | Schema + query builder for both adapters (`libsql`, `postgres-js`, `sqlite-core`, `pg-core`). |
| `npm:@libsql/client` | `0.14.0` (`/node` entry) | libSQL client for SQLite `file:` URLs (`createClient` in `client.ts` / `ensure_schema.ts`).   |
| `npm:postgres`       | `3.4.8`                  | PostgreSQL client used by Drizzle `postgres-js` adapter and schema bootstrap SQL.             |

## Review

| Field       | Value                                                                |
| ----------- | -------------------------------------------------------------------- |
| Approved by | (reviewer name or handle — after explicit approval of this ADR text) |
| Approved at | `YYYY-MM-DDTHH:mm:ssZ` (UTC — when approval was given)               |

## Consequences

- **Positive**: Typed queries with one domain/repository surface across SQLite/libSQL and PostgreSQL
  hosting.
- **Negative**: Two schema definitions are maintained (libSQL + PostgreSQL flavors of the same
  tables).
- **Follow-up**: Formal `drizzle-kit` migrations in CI if schema churn increases.
