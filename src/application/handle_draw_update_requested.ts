import { type CloudEvent, createCloudEvent } from "../events/cloudevents.ts";
import {
  type DrawResultPersistData,
  EVENT_TYPE_DRAW_RESULT_PERSIST,
  isDrawUpdateRequestedEvent,
} from "../events/pipeline.ts";
import type { DrawResultFetcher } from "../ports/draw_result_fetcher.ts";
import type { EmitCloudEvent } from "../ports/event_emitter.ts";

export type HandleDrawUpdateRequestedDeps = {
  emit: EmitCloudEvent;
  fetcher: DrawResultFetcher;
  gameId: string;
};

/**
 * 1) `draw.update.requested` → fetch official numbers → emit `draw.result.persist`.
 */
export async function handleDrawUpdateRequested(
  event: CloudEvent<unknown>,
  deps: HandleDrawUpdateRequestedDeps,
): Promise<void> {
  if (!isDrawUpdateRequestedEvent(event)) {
    return;
  }

  const fetchResult = await deps.fetcher.fetchLatestDraw();
  if (fetchResult === null) {
    return;
  }

  const persistData: DrawResultPersistData = {
    gameId: deps.gameId,
    drawKey: fetchResult.drawKey,
    winningNumbers: fetchResult.winningNumbers as DrawResultPersistData["winningNumbers"],
    resultSource: fetchResult.resultSource,
    prizeAmountsByHits: fetchResult.prizeAmountsByHits,
    lastMaxWinPrize: fetchResult.lastMaxWinPrize,
    nextPossibleMaxWinPrize: fetchResult.nextPossibleMaxWinPrize,
  };

  const persistEvent = createCloudEvent<DrawResultPersistData>({
    id: crypto.randomUUID(),
    source: "dev.szerencsejatek.telegram/pipeline",
    type: EVENT_TYPE_DRAW_RESULT_PERSIST,
    datacontenttype: "application/json",
    data: persistData,
  });

  await deps.emit(persistEvent);
}
