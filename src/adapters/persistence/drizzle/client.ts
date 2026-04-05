import { createClient } from "npm:@libsql/client@0.14.0/node";
import { drizzle } from "npm:drizzle-orm@0.45.1/libsql";
import * as schema from "./schema.ts";
import { normalizeDatabaseUrlForLibsql } from "./database_url.ts";

export type AppDatabase = ReturnType<typeof createAppDatabase>;

/** Creates a Drizzle instance backed by libSQL (SQLite `file:` or `libsql:` remote). */
export function createAppDatabase(databaseUrl: string) {
  const normalizedUrl = normalizeDatabaseUrlForLibsql(databaseUrl);
  const client = createClient({ url: normalizedUrl });
  return drizzle(client, { schema });
}
