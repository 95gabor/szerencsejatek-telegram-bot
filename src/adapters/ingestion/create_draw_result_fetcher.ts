import { parseSupportedGameId, type SupportedGameId } from "../../domain/mod.ts";
import type { DrawResultFetcher } from "../../ports/draw_result_fetcher.ts";
import { BetHuOtoslottoFetcher } from "./bet_hu_otoslotto_fetcher.ts";
import { EurojackpotFetcher } from "./eurojackpot_fetcher.ts";

export function createDrawResultFetcher(input: {
  gameId: SupportedGameId | string;
  otoslottoUrl: string;
  eurojackpotUrl: string;
}): DrawResultFetcher {
  const gameId = parseSupportedGameId(input.gameId);
  if (gameId === "otoslotto") {
    return new BetHuOtoslottoFetcher({ url: input.otoslottoUrl });
  }
  return new EurojackpotFetcher({ url: input.eurojackpotUrl });
}
