import { type CloudEvent, createCloudEvent } from "../events/cloudevents.ts";
import {
  type DrawResultStoredData,
  EVENT_TYPE_DRAW_RESULT_STORED,
  isDrawResultPersistEvent,
} from "../events/otoslotto_pipeline.ts";
import { parseOtoslottoLine } from "../domain/otoslotto/mod.ts";
import type { DrawRecordRepository } from "../ports/repositories.ts";
import type { EmitCloudEvent } from "../ports/event_emitter.ts";

export type HandleDrawResultPersistDeps = {
  emit: EmitCloudEvent;
  draws: DrawRecordRepository;
};

/**
 * 2) `draw.result.persist` → insert draw if new → emit `draw.result.stored` (idempotent).
 */
export async function handleDrawResultPersist(
  event: CloudEvent<unknown>,
  deps: HandleDrawResultPersistDeps,
): Promise<void> {
  if (!isDrawResultPersistEvent(event)) {
    return;
  }

  const persistPayload = event.data;
  if (!persistPayload) {
    return;
  }

  const winningNumbers = parseOtoslottoLine([...persistPayload.winningNumbers]);

  const wasInserted = await deps.draws.tryInsertDraw({
    gameId: persistPayload.gameId,
    drawKey: persistPayload.drawKey,
    winningNumbers,
    resultSource: persistPayload.resultSource,
    prizeAmountsByHits: persistPayload.prizeAmountsByHits,
  });

  if (!wasInserted) {
    return;
  }

  const storedData: DrawResultStoredData = {
    gameId: persistPayload.gameId,
    drawKey: persistPayload.drawKey,
    winningNumbers: winningNumbers as DrawResultStoredData["winningNumbers"],
    resultSource: persistPayload.resultSource,
    prizeAmountsByHits: persistPayload.prizeAmountsByHits,
  };

  const storedEvent = createCloudEvent<DrawResultStoredData>({
    id: crypto.randomUUID(),
    source: "dev.szerencsejatek.telegram/pipeline",
    type: EVENT_TYPE_DRAW_RESULT_STORED,
    datacontenttype: "application/json",
    data: storedData,
  });

  await deps.emit(storedEvent);
}
