import { type CloudEvent, createCloudEvent } from "../events/cloudevents.ts";
import {
  EVENT_TYPE_USER_NOTIFICATION_REQUESTED,
  isDrawResultStoredEvent,
  type UserNotificationRequestedData,
} from "../events/otoslotto_pipeline.ts";
import { parseOtoslottoLine } from "../domain/otoslotto/mod.ts";
import type { Locale } from "../i18n/mod.ts";
import { formatOtoslottoUserMessage } from "./format_otoslotto_user_message.ts";
import type { PlayedLineRepository } from "../ports/repositories.ts";
import type { EmitCloudEvent } from "../ports/event_emitter.ts";

export type HandleDrawResultStoredDeps = {
  emit: EmitCloudEvent;
  lines: PlayedLineRepository;
  locale: Locale;
};

/**
 * 3) `draw.result.stored` → load players for this game → emit one `user.notification.requested` per user.
 */
export async function handleDrawResultStored(
  event: CloudEvent<unknown>,
  deps: HandleDrawResultStoredDeps,
): Promise<void> {
  if (!isDrawResultStoredEvent(event)) {
    return;
  }

  const storedPayload = event.data;
  if (!storedPayload) {
    return;
  }

  const winningNumbers = parseOtoslottoLine([...storedPayload.winningNumbers]);

  const subscribersWithLines = await deps.lines.listUsersWithLines(storedPayload.gameId);

  for (const subscriber of subscribersWithLines) {
    const messageText = formatOtoslottoUserMessage(
      deps.locale,
      storedPayload.drawKey,
      winningNumbers,
      subscriber.lines,
      storedPayload.prizeAmountsByHits,
    );

    const notificationData: UserNotificationRequestedData = {
      chatId: subscriber.user.chatId.toString(),
      messageText,
    };

    const notificationEvent = createCloudEvent<UserNotificationRequestedData>({
      id: crypto.randomUUID(),
      source: "dev.szerencsejatek.telegram/pipeline",
      type: EVENT_TYPE_USER_NOTIFICATION_REQUESTED,
      datacontenttype: "application/json",
      data: notificationData,
    });

    await deps.emit(notificationEvent);
  }
}
