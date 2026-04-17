import type { OtoslottoLine, OtoslottoPrizeAmountsByHits } from "../domain/otoslotto/mod.ts";

/** Fetches latest official Ötöslottó numbers from the configured source (HTTP, CSV, stub, …). */
export interface DrawResultFetcher {
  fetchLatestOtoslottoDraw(): Promise<
    {
      drawKey: string;
      winningNumbers: OtoslottoLine;
      resultSource: string;
      prizeAmountsByHits?: OtoslottoPrizeAmountsByHits;
      lastMaxWinPrize?: string;
      nextPossibleMaxWinPrize?: string;
    } | null
  >;
}
