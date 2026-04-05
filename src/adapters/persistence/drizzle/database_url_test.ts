import { assertEquals, assertThrows } from "jsr:@std/assert@1";
import { normalizeDatabaseUrlForLibsql } from "./database_url.ts";

Deno.test("keeps file sqlite URL unchanged", () => {
  const url = "file:./data/app.db";
  assertEquals(normalizeDatabaseUrlForLibsql(url), url);
});

Deno.test("removes sslmode query param from libsql-compatible URL", () => {
  const raw = "https://example-db.invalid?authToken=token&sslmode=require";
  const normalized = normalizeDatabaseUrlForLibsql(raw);
  assertEquals(normalized, "https://example-db.invalid/?authToken=token");
});

Deno.test("throws clear error for postgres URLs", () => {
  assertThrows(
    () => normalizeDatabaseUrlForLibsql("postgres://user:pass@localhost:5432/db?sslmode=require"),
    Error,
    "DATABASE_URL uses postgres://",
  );
});
