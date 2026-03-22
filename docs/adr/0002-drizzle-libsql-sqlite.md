# ADR 0002: Drizzle ORM with libSQL (SQLite file)

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

Use **Drizzle ORM** with the **libSQL** driver (`@libsql/client` **node** entry for `file:` SQLite),
`drizzle-orm` **libsql** session, and schema in `src/adapters/persistence/drizzle/schema.ts`.
Idempotent draw insert uses `INSERT ... ON CONFLICT DO NOTHING` with `RETURNING` to avoid races.

## Dependencies

Pinned in source imports (see also `deno.lock`):

| Package              | Version                  | Role                                                                                        |
| -------------------- | ------------------------ | ------------------------------------------------------------------------------------------- |
| `npm:drizzle-orm`    | `0.45.1`                 | Schema (`sqlite-core`), query builder, `libsql` session (`npm:drizzle-orm@0.45.1/libsql`).  |
| `npm:@libsql/client` | `0.14.0` (`/node` entry) | libSQL client for SQLite `file:` URLs (`createClient` in `client.ts` / `ensure_schema.ts`). |

## Review

| Field       | Value                                                                |
| ----------- | -------------------------------------------------------------------- |
| Approved by | (reviewer name or handle — after explicit approval of this ADR text) |
| Approved at | `YYYY-MM-DDTHH:mm:ssZ` (UTC — when approval was given)               |

## Consequences

- **Positive**: Typed queries, schema as code, path to Turso/libSQL remote URLs later.
- **Negative**: **FFI/native** dependency in Deno (`--allow-ffi`); Docker image must include the
  stack.
- **Follow-up**: Formal `drizzle-kit` migrations in CI if schema churn increases.
