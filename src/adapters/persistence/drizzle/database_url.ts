const SUPPORTED_LIBSQL_PROTOCOLS = new Set([
  "libsql:",
  "https:",
  "http:",
  "wss:",
  "ws:",
]);

export type PersistenceBackend = "libsql" | "postgres";

function isFileUrl(databaseUrl: string): boolean {
  return databaseUrl.startsWith("file:");
}

/**
 * Detects the persistence backend from `DATABASE_URL`.
 * - `file:` and libSQL-compatible schemes -> `libsql`
 * - `postgres://` / `postgresql://` -> `postgres`
 */
export function detectPersistenceBackend(databaseUrl: string): PersistenceBackend {
  if (isFileUrl(databaseUrl)) {
    return "libsql";
  }

  let parsed: URL;
  try {
    parsed = new URL(databaseUrl);
  } catch {
    return "libsql";
  }

  if (parsed.protocol === "postgres:" || parsed.protocol === "postgresql:") {
    return "postgres";
  }

  return "libsql";
}

/**
 * Normalizes runtime DATABASE_URL for the libSQL-backed persistence adapter.
 * - Keeps `file:` SQLite URLs unchanged.
 * - Removes `sslmode` (common in copied Postgres strings) from libSQL-compatible URLs.
 */
export function normalizeDatabaseUrlForLibsql(databaseUrl: string): string {
  if (isFileUrl(databaseUrl)) {
    return databaseUrl;
  }

  let parsed: URL;
  try {
    parsed = new URL(databaseUrl);
  } catch {
    return databaseUrl;
  }

  if (!SUPPORTED_LIBSQL_PROTOCOLS.has(parsed.protocol)) {
    return databaseUrl;
  }

  parsed.searchParams.delete("sslmode");
  return parsed.toString();
}

/** Keeps Postgres URL unchanged (placeholder for future normalization needs). */
export function normalizeDatabaseUrlForPostgres(databaseUrl: string): string {
  return databaseUrl;
}
