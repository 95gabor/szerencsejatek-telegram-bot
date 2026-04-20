import { desc, eq } from "npm:drizzle-orm@0.45.1";
import {
  type DrawWinningNumbers,
  parseDrawPayloadForGame,
  parseSupportedGameId,
  type PrizeAmountsByHits,
  serializeDrawPayloadForGame,
  type SupportedGameId,
} from "../../../domain/mod.ts";
import type { DrawRecordRepository, StoredDrawRecord } from "../../../ports/mod.ts";
import type { AppPostgresDatabase } from "./client.ts";
import { draws } from "./schema.ts";

export class DrizzlePostgresDrawRecordRepository implements DrawRecordRepository {
  constructor(private readonly db: AppPostgresDatabase) {}

  async getLatestDraw(gameId: string): Promise<StoredDrawRecord | null> {
    const supportedGameId = parseSupportedGameId(gameId);
    const rows = await this.db
      .select({
        gameId: draws.gameId,
        drawKey: draws.drawKey,
        numbersJson: draws.numbersJson,
        resultSource: draws.resultSource,
      })
      .from(draws)
      .where(eq(draws.gameId, supportedGameId))
      .orderBy(desc(draws.createdAt))
      .limit(1);

    const r = rows[0];
    if (!r) return null;

    const payload = parseDrawPayloadForGame(supportedGameId, JSON.parse(r.numbersJson));
    return {
      gameId: supportedGameId,
      drawKey: r.drawKey,
      winningNumbers: payload.winningNumbers,
      resultSource: r.resultSource,
      prizeAmountsByHits: payload.prizeAmountsByHits,
      lastMaxWinPrize: payload.lastMaxWinPrize,
      nextPossibleMaxWinPrize: payload.nextPossibleMaxWinPrize,
    };
  }

  async tryInsertDraw(input: {
    gameId: SupportedGameId;
    drawKey: string;
    winningNumbers: DrawWinningNumbers;
    resultSource: string;
    prizeAmountsByHits?: PrizeAmountsByHits;
    lastMaxWinPrize?: string;
    nextPossibleMaxWinPrize?: string;
  }): Promise<boolean> {
    const id = crypto.randomUUID();
    const inserted = await this.db
      .insert(draws)
      .values({
        id,
        gameId: input.gameId,
        drawKey: input.drawKey,
        numbersJson: serializeDrawPayloadForGame(input.gameId, {
          winningNumbers: input.winningNumbers,
          prizeAmountsByHits: input.prizeAmountsByHits,
          lastMaxWinPrize: input.lastMaxWinPrize,
          nextPossibleMaxWinPrize: input.nextPossibleMaxWinPrize,
        }),
        resultSource: input.resultSource,
        createdAt: new Date(),
      })
      .onConflictDoNothing({ target: [draws.gameId, draws.drawKey] })
      .returning({ id: draws.id });

    return inserted.length > 0;
  }
}
