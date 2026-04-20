import { and, asc, eq } from "npm:drizzle-orm@0.45.1";
import {
  parseLineForGame,
  parseSupportedGameId,
  serializeLineForGame,
  type SupportedGameId,
} from "../../../domain/mod.ts";
import type { PlayedLineRecord, PlayedLineRepository, UserRecord } from "../../../ports/mod.ts";
import type { AppDatabase } from "./client.ts";
import { playedLines, users } from "./schema.ts";

export class DrizzlePlayedLineRepository implements PlayedLineRepository {
  constructor(private readonly db: AppDatabase) {}

  async listLinesForUser(userId: string, gameId: string): Promise<PlayedLineRecord[]> {
    const rows = await this.db
      .select({
        lineId: playedLines.id,
        numbersJson: playedLines.numbersJson,
        userId: playedLines.userId,
        gameId: playedLines.gameId,
      })
      .from(playedLines)
      .where(and(eq(playedLines.userId, userId), eq(playedLines.gameId, gameId)))
      .orderBy(asc(playedLines.createdAt));

    const out: PlayedLineRecord[] = [];
    for (const r of rows) {
      const raw: unknown = JSON.parse(r.numbersJson);
      const numbers = parseLineForGame(parseSupportedGameId(r.gameId), raw);
      out.push({
        id: r.lineId,
        userId: r.userId,
        numbers,
      });
    }
    return out;
  }

  async addLine(input: {
    userId: string;
    gameId: SupportedGameId;
    numbers: PlayedLineRecord["numbers"];
  }): Promise<{ id: string }> {
    const id = crypto.randomUUID();
    await this.db.insert(playedLines).values({
      id,
      userId: input.userId,
      gameId: input.gameId,
      numbersJson: serializeLineForGame(input.gameId, input.numbers),
      createdAt: new Date(),
    });
    return { id };
  }

  async removeLine(userId: string, lineId: string): Promise<boolean> {
    const deleted = await this.db
      .delete(playedLines)
      .where(and(eq(playedLines.id, lineId), eq(playedLines.userId, userId)))
      .returning({ id: playedLines.id });
    return deleted.length > 0;
  }

  async listUsersWithLines(gameId: string): Promise<
    Array<{
      user: UserRecord;
      lines: PlayedLineRecord[];
    }>
  > {
    const rows = await this.db
      .select({
        userId: users.id,
        telegramUserId: users.telegramUserId,
        chatId: users.chatId,
        lineId: playedLines.id,
        numbersJson: playedLines.numbersJson,
        gameId: playedLines.gameId,
      })
      .from(playedLines)
      .innerJoin(users, eq(playedLines.userId, users.id))
      .where(eq(playedLines.gameId, gameId));

    const byUser = new Map<
      string,
      { user: UserRecord; lines: PlayedLineRecord[] }
    >();

    for (const r of rows) {
      let bucket = byUser.get(r.userId);
      if (!bucket) {
        bucket = {
          user: {
            id: r.userId,
            telegramUserId: BigInt(r.telegramUserId),
            chatId: BigInt(r.chatId),
          },
          lines: [],
        };
        byUser.set(r.userId, bucket);
      }
      const raw: unknown = JSON.parse(r.numbersJson);
      const numbers = parseLineForGame(parseSupportedGameId(r.gameId), raw);
      bucket.lines.push({
        id: r.lineId,
        userId: r.userId,
        numbers,
      });
    }

    return [...byUser.values()];
  }
}
