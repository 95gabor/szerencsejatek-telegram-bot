import { desc, eq } from "npm:drizzle-orm@0.45.1";
import {
  parseDrawPayloadForGame,
  parseSupportedGameId,
  type PrizeAmountsByHits,
  serializeDrawPayloadForGame,
} from "../../../domain/mod.ts";
import type { DrawRecordRepository, StoredDrawRecord } from "../../../ports/mod.ts";
import type { AppDatabase } from "./client.ts";
import { draws } from "./schema.ts";

export class DrizzleDrawRecordRepository implements DrawRecordRepository {
  constructor(private readonly db: AppDatabase) {}

  async getLatestDraw(gameId: string): Promise<StoredDrawRecord | null> {
    const rows = await this.db
      .select({
        drawKey: draws.drawKey,
        numbersJson: draws.numbersJson,
        resultSource: draws.resultSource,
      })
      .from(draws)
      .where(eq(draws.gameId, gameId))
      .orderBy(desc(draws.createdAt))
      .limit(1);

    const r = rows[0];
    if (!r) return null;

    const supportedGameId = parseSupportedGameId(gameId);
    const parsed = parseDrawPayloadForGame(supportedGameId, JSON.parse(r.numbersJson));
    return {
      gameId: supportedGameId,
      drawKey: r.drawKey,
      winningNumbers: parsed.winningNumbers,
      resultSource: r.resultSource,
      prizeAmountsByHits: parsed.prizeAmountsByHits,
      lastMaxWinPrize: parsed.lastMaxWinPrize,
      nextPossibleMaxWinPrize: parsed.nextPossibleMaxWinPrize,
    };
  }

  async tryInsertDraw(input: {
    gameId: ReturnType<typeof parseSupportedGameId>;
    drawKey: string;
    winningNumbers: StoredDrawRecord["winningNumbers"];
    resultSource: string;
    prizeAmountsByHits?: PrizeAmountsByHits;
    lastMaxWinPrize?: string;
    nextPossibleMaxWinPrize?: string;
  }): Promise<boolean> {
    const id = crypto.randomUUID();
    const numbersJson = serializeDrawPayloadForGame(input.gameId, {
      winningNumbers: input.winningNumbers,
      prizeAmountsByHits: input.prizeAmountsByHits,
      lastMaxWinPrize: input.lastMaxWinPrize,
      nextPossibleMaxWinPrize: input.nextPossibleMaxWinPrize,
    });
    const inserted = await this.db
      .insert(draws)
      .values({
        id,
        gameId: input.gameId,
        drawKey: input.drawKey,
        numbersJson,
        resultSource: input.resultSource,
        createdAt: new Date(),
      })
      .onConflictDoNothing({ target: [draws.gameId, draws.drawKey] })
      .returning({ id: draws.id });

    return inserted.length > 0;
  }
}
