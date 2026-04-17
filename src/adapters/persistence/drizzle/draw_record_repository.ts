import { desc, eq } from "npm:drizzle-orm@0.45.1";
import {
  type OtoslottoLine,
  type OtoslottoPrizeAmountsByHits,
  parseOtoslottoLine,
  parseOtoslottoMaxWinPrizes,
  parseOtoslottoPrizeAmountsByHits,
} from "../../../domain/otoslotto/mod.ts";
import type { DrawRecordRepository, StoredDrawRecord } from "../../../ports/mod.ts";
import type { AppDatabase } from "./client.ts";
import { draws } from "./schema.ts";

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

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

    const rawPayload: unknown = JSON.parse(r.numbersJson);
    const winningNumbersPayload = Array.isArray(rawPayload)
      ? rawPayload
      : isRecord(rawPayload)
      ? rawPayload.winningNumbers
      : null;
    if (
      !Array.isArray(winningNumbersPayload) ||
      winningNumbersPayload.some((n) => typeof n !== "number")
    ) {
      throw new Error(`Invalid numbers_json for draw ${r.drawKey}`);
    }
    const winningNumbers = parseOtoslottoLine(winningNumbersPayload);
    const prizeAmountsByHits = isRecord(rawPayload)
      ? parseOtoslottoPrizeAmountsByHits(rawPayload.prizeAmountsByHits)
      : undefined;
    const maxWinPrizes = isRecord(rawPayload)
      ? parseOtoslottoMaxWinPrizes({
        lastMaxWinPrize: rawPayload.lastMaxWinPrize,
        nextPossibleMaxWinPrize: rawPayload.nextPossibleMaxWinPrize,
      })
      : undefined;
    return {
      drawKey: r.drawKey,
      winningNumbers,
      resultSource: r.resultSource,
      prizeAmountsByHits,
      ...maxWinPrizes,
    };
  }

  async tryInsertDraw(input: {
    gameId: string;
    drawKey: string;
    winningNumbers: OtoslottoLine;
    resultSource: string;
    prizeAmountsByHits?: OtoslottoPrizeAmountsByHits;
    lastMaxWinPrize?: string;
    nextPossibleMaxWinPrize?: string;
  }): Promise<boolean> {
    const id = crypto.randomUUID();
    const prizeAmountsByHits = parseOtoslottoPrizeAmountsByHits(input.prizeAmountsByHits);
    const maxWinPrizes = parseOtoslottoMaxWinPrizes({
      lastMaxWinPrize: input.lastMaxWinPrize,
      nextPossibleMaxWinPrize: input.nextPossibleMaxWinPrize,
    });
    const numbersPayload = {
      winningNumbers: [...input.winningNumbers],
      ...(prizeAmountsByHits ? { prizeAmountsByHits } : {}),
      ...(maxWinPrizes ?? {}),
    };
    const inserted = await this.db
      .insert(draws)
      .values({
        id,
        gameId: input.gameId,
        drawKey: input.drawKey,
        numbersJson: JSON.stringify(numbersPayload),
        resultSource: input.resultSource,
        createdAt: new Date(),
      })
      .onConflictDoNothing({ target: [draws.gameId, draws.drawKey] })
      .returning({ id: draws.id });

    return inserted.length > 0;
  }
}
