import type { DrawResultFetcher } from "../../ports/draw_result_fetcher.ts";

/** Returns no remote draw — replace with a real HTTP/CSV adapter when ready. */
export class StubDrawResultFetcher implements DrawResultFetcher {
  fetchLatestOtoslottoDraw() {
    return Promise.resolve(null);
  }
}
