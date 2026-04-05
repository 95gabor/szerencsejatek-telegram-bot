import postgres from "npm:postgres@3.4.8";
import { normalizeDatabaseUrlForPostgres } from "../drizzle/database_url.ts";

const STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY NOT NULL,
    telegram_user_id TEXT NOT NULL UNIQUE,
    chat_id TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL
  )`,
  "CREATE INDEX IF NOT EXISTS users_chat_idx ON users (chat_id)",
  `CREATE TABLE IF NOT EXISTS played_lines (
    id TEXT PRIMARY KEY NOT NULL,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    game_id TEXT NOT NULL,
    numbers_json TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL
  )`,
  "CREATE INDEX IF NOT EXISTS played_lines_user_game_idx ON played_lines (user_id, game_id)",
  `CREATE TABLE IF NOT EXISTS draws (
    id TEXT PRIMARY KEY NOT NULL,
    game_id TEXT NOT NULL,
    draw_key TEXT NOT NULL,
    numbers_json TEXT NOT NULL,
    result_source TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL
  )`,
  "CREATE UNIQUE INDEX IF NOT EXISTS draws_game_draw_uidx ON draws (game_id, draw_key)",
];

export async function ensurePostgresSchema(databaseUrl: string): Promise<void> {
  const normalizedUrl = normalizeDatabaseUrlForPostgres(databaseUrl);
  const sql = postgres(normalizedUrl, {
    prepare: false,
    max: 1,
    onnotice: () => {
      // Keep postgres notices out of app logs by default.
    },
  });
  try {
    for (const statement of STATEMENTS) {
      await sql.unsafe(statement);
    }
  } finally {
    await sql.end();
  }
}
