import type { CloudEvent } from "../events/cloudevents.ts";
import { isUserNotificationRequestedEvent } from "../events/pipeline.ts";
import type { OutboundNotifier } from "../ports/outbound_notifier.ts";

export type HandleUserNotificationRequestedDeps = {
  notifier: OutboundNotifier;
};

/**
 * 4) `user.notification.requested` → send one outbound message (Telegram, etc.).
 */
export async function handleUserNotificationRequested(
  event: CloudEvent<unknown>,
  deps: HandleUserNotificationRequestedDeps,
): Promise<void> {
  if (!isUserNotificationRequestedEvent(event)) {
    return;
  }

  const notificationPayload = event.data;
  if (!notificationPayload) {
    return;
  }

  await deps.notifier.sendUserMessage({
    chatId: BigInt(notificationPayload.chatId),
    text: notificationPayload.messageText,
  });
}
