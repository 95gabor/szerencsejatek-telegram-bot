import type { OtoslottoLine } from "../domain/otoslotto/mod.ts";

/** Fetches latest official Ötöslottó numbers from the configured source (HTTP, CSV, stub, …). */
export interface DrawResultFetcher {
  fetchLatestOtoslottoDraw(): Promise<
    {
      drawKey: string;
      winningNumbers: OtoslottoLine;
      resultSource: string;
    } | null
  >;
}
