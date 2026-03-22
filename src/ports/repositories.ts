import type { OtoslottoLine } from "../domain/otoslotto/mod.ts";

export type UserRecord = {
  id: string;
  telegramUserId: bigint;
  chatId: bigint;
};

export type PlayedLineRecord = {
  id: string;
  userId: string;
  /** Sorted five numbers for Ötöslottó. */
  numbers: OtoslottoLine;
};

/** Telegram identity → internal user row (chat id updated on each interaction). */
export interface UserRepository {
  upsertUser(input: { telegramUserId: bigint; chatId: bigint }): Promise<{ id: string }>;
}

/** Persistence for user-submitted lines (per game). */
export interface PlayedLineRepository {
  listUsersWithLines(gameId: string): Promise<
    Array<{
      user: UserRecord;
      lines: PlayedLineRecord[];
    }>
  >;

  /** User’s lines for one game, oldest first (stable indices for /remove). */
  listLinesForUser(userId: string, gameId: string): Promise<PlayedLineRecord[]>;

  addLine(input: {
    userId: string;
    gameId: string;
    numbers: OtoslottoLine;
  }): Promise<{ id: string }>;

  /** Deletes the line if it belongs to this user. */
  removeLine(userId: string, lineId: string): Promise<boolean>;
}

/** Row read back from `draws` (e.g. latest for a game). */
export type StoredDrawRecord = {
  drawKey: string;
  winningNumbers: OtoslottoLine;
  resultSource: string;
};

/** Ensures a draw is processed once and stores official numbers. */
export interface DrawRecordRepository {
  /** @returns `true` if this draw was newly inserted, `false` if it already existed. */
  tryInsertDraw(input: {
    gameId: string;
    drawKey: string;
    winningNumbers: OtoslottoLine;
    resultSource: string;
  }): Promise<boolean>;

  /** Most recently stored draw for this game (`created_at` desc), or `null` if none. */
  getLatestDraw(gameId: string): Promise<StoredDrawRecord | null>;
}
