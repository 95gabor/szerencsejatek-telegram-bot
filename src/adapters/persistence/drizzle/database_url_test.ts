import { assertEquals } from "jsr:@std/assert@1";
import { detectPersistenceBackend, normalizeDatabaseUrlForLibsql } from "./database_url.ts";

Deno.test("keeps file sqlite URL unchanged", () => {
  const url = "file:./data/app.db";
  assertEquals(normalizeDatabaseUrlForLibsql(url), url);
});

Deno.test("removes sslmode query param from libsql-compatible URL", () => {
  const raw = "https://example-db.invalid?authToken=token&sslmode=require";
  const normalized = normalizeDatabaseUrlForLibsql(raw);
  assertEquals(normalized, "https://example-db.invalid/?authToken=token");
});

Deno.test("detects postgres backend from postgres URL", () => {
  assertEquals(
    detectPersistenceBackend("postgres://user:pass@localhost:5432/db?sslmode=require"),
    "postgres",
  );
});

Deno.test("detects libsql backend from file URL", () => {
  assertEquals(detectPersistenceBackend("file:./data/app.db"), "libsql");
});
