import type {
  DrawPayload,
  DrawWinningNumbers,
  PlayedLine,
  SupportedGameId,
} from "../domain/mod.ts";

export type UserRecord = {
  id: string;
  telegramUserId: bigint;
  chatId: bigint;
};

export type PlayedLineRecord = {
  id: string;
  userId: string;
  gameId: SupportedGameId;
  /** Validated line for selected game (Ötöslottó or Eurojackpot). */
  numbers: PlayedLine;
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
    gameId: SupportedGameId;
    numbers: PlayedLine;
  }): Promise<{ id: string }>;

  /** Deletes the line if it belongs to this user. */
  removeLine(userId: string, lineId: string): Promise<boolean>;
}

/** Row read back from `draws` (e.g. latest for a game). */
export type StoredDrawRecord = {
  drawKey: string;
  gameId: SupportedGameId;
  winningNumbers: DrawWinningNumbers;
  resultSource: string;
  prizeAmountsByHits?: DrawPayload["prizeAmountsByHits"];
  lastMaxWinPrize?: string;
  nextPossibleMaxWinPrize?: string;
};

/** Ensures a draw is processed once and stores official numbers. */
export interface DrawRecordRepository {
  /** @returns `true` if this draw was newly inserted, `false` if it already existed. */
  tryInsertDraw(input: {
    gameId: SupportedGameId;
    drawKey: string;
    winningNumbers: DrawWinningNumbers;
    resultSource: string;
    prizeAmountsByHits?: DrawPayload["prizeAmountsByHits"];
    lastMaxWinPrize?: string;
    nextPossibleMaxWinPrize?: string;
  }): Promise<boolean>;

  /** Most recently stored draw for this game (`created_at` desc), or `null` if none. */
  getLatestDraw(gameId: SupportedGameId): Promise<StoredDrawRecord | null>;
}
