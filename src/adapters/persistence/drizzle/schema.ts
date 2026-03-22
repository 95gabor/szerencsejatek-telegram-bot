import { index, integer, sqliteTable, text, uniqueIndex } from "npm:drizzle-orm@0.45.1/sqlite-core";

/** Registered Telegram users. */
export const users = sqliteTable(
  "users",
  {
    id: text("id").primaryKey(),
    telegramUserId: text("telegram_user_id").notNull().unique(),
    chatId: text("chat_id").notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  },
  (t) => [index("users_chat_idx").on(t.chatId)],
);

/** User-submitted lines per game (`otoslotto`, …). */
export const playedLines = sqliteTable(
  "played_lines",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    gameId: text("game_id").notNull(),
    /** JSON array of five numbers, ascending. */
    numbersJson: text("numbers_json").notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  },
  (t) => [index("played_lines_user_game_idx").on(t.userId, t.gameId)],
);

/** Official draw results (idempotent by game + draw key). */
export const draws = sqliteTable(
  "draws",
  {
    id: text("id").primaryKey(),
    gameId: text("game_id").notNull(),
    drawKey: text("draw_key").notNull(),
    numbersJson: text("numbers_json").notNull(),
    resultSource: text("result_source").notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  },
  (t) => [uniqueIndex("draws_game_draw_uidx").on(t.gameId, t.drawKey)],
);
