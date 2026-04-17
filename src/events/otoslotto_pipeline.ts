import { type CloudEvent, CLOUDEVENTS_SPEC_VERSION, createCloudEvent } from "./cloudevents.ts";
import type { OtoslottoPrizeAmountsByHits } from "../domain/otoslotto/mod.ts";

/** Cron/tick: fetch latest official numbers from the configured source. */
export const EVENT_TYPE_DRAW_UPDATE_REQUESTED =
  "dev.szerencsejatek.telegram.otoslotto.draw.update.requested.v1";

/** Persist this draw (from fetcher or manual import); leads to `...stored` if new. */
export const EVENT_TYPE_DRAW_RESULT_PERSIST =
  "dev.szerencsejatek.telegram.otoslotto.draw.result.persist.v1";

/** Draw row committed exactly once — fan out to subscribers. */
export const EVENT_TYPE_DRAW_RESULT_STORED =
  "dev.szerencsejatek.telegram.otoslotto.draw.result.stored.v1";

/** Deliver one outbound user message (one per draw per user). */
export const EVENT_TYPE_USER_NOTIFICATION_REQUESTED =
  "dev.szerencsejatek.telegram.otoslotto.user.notification.requested.v1";

export type DrawUpdateRequestedData = {
  gameId: string;
};

export type DrawResultPersistData = {
  gameId: string;
  drawKey: string;
  winningNumbers: [number, number, number, number, number];
  resultSource: string;
  prizeAmountsByHits?: OtoslottoPrizeAmountsByHits;
};

export type DrawResultStoredData = DrawResultPersistData;

/** `chatId` as decimal string (JSON-safe); convert to `bigint` when calling Telegram. */
export type UserNotificationRequestedData = {
  chatId: string;
  messageText: string;
};

export type DrawUpdateRequestedEvent = CloudEvent<DrawUpdateRequestedData>;
export type DrawResultPersistEvent = CloudEvent<DrawResultPersistData>;
export type DrawResultStoredEvent = CloudEvent<DrawResultStoredData>;
export type UserNotificationRequestedEvent = CloudEvent<UserNotificationRequestedData>;

function hasRecordData(data: unknown): data is Record<string, unknown> {
  return data !== null && data !== undefined && typeof data === "object";
}

function isPrizeAmountsByHits(value: unknown): value is OtoslottoPrizeAmountsByHits {
  if (value === undefined) {
    return true;
  }
  if (!hasRecordData(value) || Array.isArray(value)) {
    return false;
  }
  const allowedKeys = new Set(["2", "3", "4", "5"]);
  for (const [key, amount] of Object.entries(value)) {
    if (!allowedKeys.has(key) || typeof amount !== "string") {
      return false;
    }
  }
  return true;
}

export function isDrawUpdateRequestedEvent(
  event: CloudEvent<unknown>,
): event is DrawUpdateRequestedEvent {
  if (event.specversion !== CLOUDEVENTS_SPEC_VERSION) return false;
  if (event.type !== EVENT_TYPE_DRAW_UPDATE_REQUESTED) return false;
  if (!hasRecordData(event.data)) return false;
  return typeof event.data.gameId === "string";
}

export function isDrawResultPersistEvent(
  event: CloudEvent<unknown>,
): event is DrawResultPersistEvent {
  if (event.specversion !== CLOUDEVENTS_SPEC_VERSION) return false;
  if (event.type !== EVENT_TYPE_DRAW_RESULT_PERSIST) return false;
  if (!hasRecordData(event.data)) return false;
  const data = event.data;
  return typeof data.gameId === "string" &&
    typeof data.drawKey === "string" &&
    typeof data.resultSource === "string" &&
    Array.isArray(data.winningNumbers) &&
    data.winningNumbers.length === 5 &&
    isPrizeAmountsByHits(data.prizeAmountsByHits);
}

export function isDrawResultStoredEvent(
  event: CloudEvent<unknown>,
): event is DrawResultStoredEvent {
  if (event.specversion !== CLOUDEVENTS_SPEC_VERSION) return false;
  if (event.type !== EVENT_TYPE_DRAW_RESULT_STORED) return false;
  if (!hasRecordData(event.data)) return false;
  const data = event.data;
  return typeof data.gameId === "string" &&
    typeof data.drawKey === "string" &&
    typeof data.resultSource === "string" &&
    Array.isArray(data.winningNumbers) &&
    data.winningNumbers.length === 5 &&
    isPrizeAmountsByHits(data.prizeAmountsByHits);
}

export function isUserNotificationRequestedEvent(
  event: CloudEvent<unknown>,
): event is UserNotificationRequestedEvent {
  if (event.specversion !== CLOUDEVENTS_SPEC_VERSION) return false;
  if (event.type !== EVENT_TYPE_USER_NOTIFICATION_REQUESTED) return false;
  if (!hasRecordData(event.data)) return false;
  const data = event.data;
  return typeof data.messageText === "string" &&
    typeof data.chatId === "string";
}

/** Helper for tests and composition roots. */
export function buildPersistEvent(
  input: DrawResultPersistData,
): DrawResultPersistEvent {
  return createCloudEvent({
    id: crypto.randomUUID(),
    source: "dev.szerencsejatek.telegram/pipeline",
    type: EVENT_TYPE_DRAW_RESULT_PERSIST,
    datacontenttype: "application/json",
    data: input,
  });
}
