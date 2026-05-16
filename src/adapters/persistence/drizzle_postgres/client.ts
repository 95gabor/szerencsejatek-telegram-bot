import { drizzle } from "npm:drizzle-orm@0.45.1/postgres-js";
import postgres from "postgres";
import * as schema from "./schema.ts";

export type AppPostgresDatabase = ReturnType<typeof createPostgresDatabase>;

/** Creates a Drizzle instance backed by postgres-js (`postgres://` URLs). */
export function createPostgresDatabase(databaseUrl: string) {
  const client = postgres(databaseUrl, {
    prepare: false,
    onnotice: () => {
      // Keep postgres notices out of app logs by default.
    },
  });
  return drizzle(client, { schema });
}
