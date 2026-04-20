/**
 * Composition root — wire `createPipelineEmitter` to cron, webhooks, or CLI.
 */
export { createPipelineEmitter, dispatchPipelineEvent } from "./application/dispatch.ts";
export { createDrawResultFetcher } from "./adapters/ingestion/create_draw_result_fetcher.ts";
export {
  BetHuOtoslottoFetcher,
  DEFAULT_OTOSLOTTO_RESULT_JSON_URL,
} from "./adapters/ingestion/bet_hu_otoslotto_fetcher.ts";
export {
  DEFAULT_EUROJACKPOT_RESULT_JSON_URL,
  EurojackpotFetcher,
} from "./adapters/ingestion/eurojackpot_fetcher.ts";
export { StubDrawResultFetcher } from "./adapters/ingestion/stub_draw_result_fetcher.ts";
