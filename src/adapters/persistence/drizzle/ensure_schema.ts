import { createClient } from "npm:@libsql/client@0.14.0/node";
import { normalizeDatabaseUrlForLibsql } from "./database_url.ts";

const STATEMENTS = [
  "PRAGMA foreign_keys = ON",
  `CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY NOT NULL,
    telegram_user_id TEXT NOT NULL UNIQUE,
    chat_id TEXT NOT NULL,
    created_at INTEGER NOT NULL
  )`,
  "CREATE INDEX IF NOT EXISTS users_chat_idx ON users (chat_id)",
  `CREATE TABLE IF NOT EXISTS played_lines (
    id TEXT PRIMARY KEY NOT NULL,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    game_id TEXT NOT NULL,
    numbers_json TEXT NOT NULL,
    created_at INTEGER NOT NULL
  )`,
  "CREATE INDEX IF NOT EXISTS played_lines_user_game_idx ON played_lines (user_id, game_id)",
  `CREATE TABLE IF NOT EXISTS draws (
    id TEXT PRIMARY KEY NOT NULL,
    game_id TEXT NOT NULL,
    draw_key TEXT NOT NULL,
    numbers_json TEXT NOT NULL,
    result_source TEXT NOT NULL,
    created_at INTEGER NOT NULL
  )`,
  "CREATE UNIQUE INDEX IF NOT EXISTS draws_game_draw_uidx ON draws (game_id, draw_key)",
];

export async function ensureSchema(databaseUrl: string): Promise<void> {
  const normalizedUrl = normalizeDatabaseUrlForLibsql(databaseUrl);
  const client = createClient({ url: normalizedUrl });
  for (const statement of STATEMENTS) {
    await client.execute(statement);
  }
}
