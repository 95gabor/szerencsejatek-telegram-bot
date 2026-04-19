import type { DrawWinningNumbers, PrizeAmountsByHits } from "../domain/game.ts";

export type FetchedDrawResult = {
  drawKey: string;
  winningNumbers: DrawWinningNumbers;
  resultSource: string;
  prizeAmountsByHits?: PrizeAmountsByHits;
  lastMaxWinPrize?: string;
  nextPossibleMaxWinPrize?: string;
};

/** Fetches latest official draw numbers for the configured game (HTTP, CSV, stub, …). */
export interface DrawResultFetcher {
  fetchLatestDraw(): Promise<FetchedDrawResult | null>;
}
