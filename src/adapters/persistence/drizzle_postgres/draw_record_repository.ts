import { desc, eq } from "npm:drizzle-orm@0.45.1";
import { type OtoslottoLine, parseOtoslottoLine } from "../../../domain/otoslotto/mod.ts";
import type { DrawRecordRepository, StoredDrawRecord } from "../../../ports/mod.ts";
import type { AppPostgresDatabase } from "./client.ts";
import { draws } from "./schema.ts";

export class DrizzlePostgresDrawRecordRepository implements DrawRecordRepository {
  constructor(private readonly db: AppPostgresDatabase) {}

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

    const raw: unknown = JSON.parse(r.numbersJson);
    if (!Array.isArray(raw) || raw.some((n) => typeof n !== "number")) {
      throw new Error(`Invalid numbers_json for draw ${r.drawKey}`);
    }
    const winningNumbers = parseOtoslottoLine(raw);
    return {
      drawKey: r.drawKey,
      winningNumbers,
      resultSource: r.resultSource,
    };
  }

  async tryInsertDraw(input: {
    gameId: string;
    drawKey: string;
    winningNumbers: OtoslottoLine;
    resultSource: string;
  }): Promise<boolean> {
    const id = crypto.randomUUID();
    const inserted = await this.db
      .insert(draws)
      .values({
        id,
        gameId: input.gameId,
        drawKey: input.drawKey,
        numbersJson: JSON.stringify([...input.winningNumbers]),
        resultSource: input.resultSource,
        createdAt: new Date(),
      })
      .onConflictDoNothing({ target: [draws.gameId, draws.drawKey] })
      .returning({ id: draws.id });

    return inserted.length > 0;
  }
}
