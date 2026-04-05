const SUPPORTED_LIBSQL_PROTOCOLS = new Set([
  "libsql:",
  "https:",
  "http:",
  "wss:",
  "ws:",
]);

function isFileUrl(databaseUrl: string): boolean {
  return databaseUrl.startsWith("file:");
}

/**
 * Normalizes runtime DATABASE_URL for the current libSQL-backed persistence adapter.
 * - Keeps `file:` SQLite URLs unchanged.
 * - Removes `sslmode` (common in Postgres URLs) from libSQL-compatible URLs.
 * - Fails fast with a clear error for `postgres://` and other unsupported schemes.
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

  if (parsed.protocol === "postgres:" || parsed.protocol === "postgresql:") {
    throw new Error(
      "DATABASE_URL uses postgres://, but this build uses a libSQL/SQLite adapter only. " +
        "Use file: or libsql:/https:/wss: DATABASE_URL.",
    );
  }

  if (!SUPPORTED_LIBSQL_PROTOCOLS.has(parsed.protocol)) {
    throw new Error(
      `DATABASE_URL scheme '${parsed.protocol}' is not supported by the libSQL adapter. ` +
        "Use file: or libsql:/https:/wss: DATABASE_URL.",
    );
  }

  parsed.searchParams.delete("sslmode");
  return parsed.toString();
}
