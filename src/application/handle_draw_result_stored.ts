import { type CloudEvent, createCloudEvent } from "../events/cloudevents.ts";
import {
  EVENT_TYPE_USER_NOTIFICATION_REQUESTED,
  isDrawResultStoredEvent,
  type UserNotificationRequestedData,
} from "../events/pipeline.ts";
import {
  GAME_ID_OTOSLOTTO,
  parseLineForGame,
  parseSupportedGameId,
  type PlayedLine,
  type PrizeAmountsByHits,
  type SupportedGameId,
} from "../domain/mod.ts";
import type { Locale } from "../i18n/mod.ts";
import type { EurojackpotLine } from "../domain/eurojackpot/mod.ts";
import type { OtoslottoLine } from "../domain/otoslotto/mod.ts";
import { formatOtoslottoUserMessage } from "./format_otoslotto_user_message.ts";
import { formatEurojackpotUserMessage } from "./format_eurojackpot_user_message.ts";
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

  const gameId = parseSupportedGameId(storedPayload.gameId);
  const winningNumbers = parseLineForGame(gameId, storedPayload.winningNumbers);

  const subscribersWithLines = await deps.lines.listUsersWithLines(storedPayload.gameId);

  for (const subscriber of subscribersWithLines) {
    const messageText = formatUserMessageByGame(gameId, {
      locale: deps.locale,
      drawKey: storedPayload.drawKey,
      winningNumbers,
      playedLines: subscriber.lines.map((line) => line.numbers),
      prizeAmountsByHits: storedPayload.prizeAmountsByHits,
      lastMaxWinPrize: storedPayload.lastMaxWinPrize,
    });

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

function formatUserMessageByGame(
  gameId: SupportedGameId,
  input: {
    locale: Locale;
    drawKey: string;
    winningNumbers: PlayedLine;
    playedLines: PlayedLine[];
    prizeAmountsByHits?: PrizeAmountsByHits;
    lastMaxWinPrize?: string;
  },
): string {
  if (gameId === GAME_ID_OTOSLOTTO) {
    return formatOtoslottoUserMessage(
      input.locale,
      input.drawKey,
      input.winningNumbers as OtoslottoLine,
      input.playedLines.map((numbers) => ({ numbers: numbers as OtoslottoLine })),
      input.prizeAmountsByHits,
      input.lastMaxWinPrize,
    );
  }
  return formatEurojackpotUserMessage(
    input.locale,
    input.drawKey,
    input.winningNumbers as EurojackpotLine,
    input.playedLines.map((numbers) => ({ numbers: numbers as EurojackpotLine })),
    input.lastMaxWinPrize,
  );
}
