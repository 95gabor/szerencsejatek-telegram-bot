import { assertEquals } from "jsr:@std/assert@1/equals";
import { configureLogger } from "../logging/mod.ts";
import { createCloudEvent } from "../events/cloudevents.ts";
import {
  EVENT_TYPE_DRAW_RESULT_PERSIST,
  EVENT_TYPE_DRAW_RESULT_STORED,
  EVENT_TYPE_DRAW_UPDATE_REQUESTED,
  EVENT_TYPE_USER_NOTIFICATION_REQUESTED,
} from "../events/otoslotto_pipeline.ts";
import { GAME_ID_OTOSLOTTO } from "../domain/otoslotto/mod.ts";
import type { DrawResultFetcher } from "../ports/draw_result_fetcher.ts";
import type { DrawRecordRepository, PlayedLineRepository } from "../ports/repositories.ts";
import type { EmitCloudEvent } from "../ports/event_emitter.ts";
import type { OutboundNotifier } from "../ports/outbound_notifier.ts";
import { createPipelineEmitter, dispatchPipelineEvent } from "./dispatch.ts";
import { formatOtoslottoUserMessage } from "./format_otoslotto_user_message.ts";

configureLogger({ format: "text", level: "error" });

Deno.test("pipeline: update → persist → stored → notification", async () => {
  const sentMessages: Array<{ chatId: bigint; text: string }> = [];

  const fetcher: DrawResultFetcher = {
    fetchLatestOtoslottoDraw() {
      return Promise.resolve({
        drawKey: "2026-W12",
        winningNumbers: [7, 18, 22, 52, 89],
        resultSource: "test",
        prizeAmountsByHits: {
          5: "0 Ft",
          4: "2 494 605 Ft",
          3: "29 850 Ft",
          2: "3 385 Ft",
        },
      });
    },
  };

  const draws: DrawRecordRepository = {
    tryInsertDraw() {
      return Promise.resolve(true);
    },
    getLatestDraw() {
      return Promise.reject(new Error("not used in pipeline test"));
    },
  };

  const lines: PlayedLineRepository = {
    listUsersWithLines() {
      return Promise.resolve([
        {
          user: {
            id: "user-1",
            telegramUserId: 1n,
            chatId: 99n,
          },
          lines: [
            {
              id: "line-1",
              userId: "user-1",
              numbers: [7, 18, 22, 52, 89],
            },
          ],
        },
      ]);
    },
    listLinesForUser() {
      return Promise.reject(new Error("not used in pipeline test"));
    },
    addLine() {
      return Promise.reject(new Error("not used in pipeline test"));
    },
    removeLine() {
      return Promise.reject(new Error("not used in pipeline test"));
    },
  };

  const notifier: OutboundNotifier = {
    sendUserMessage(input) {
      sentMessages.push(input);
      return Promise.resolve();
    },
  };

  const emit = createPipelineEmitter({
    fetcher,
    draws,
    lines,
    notifier,
    gameId: GAME_ID_OTOSLOTTO,
    locale: "hu",
  });

  const tick = createCloudEvent({
    id: "tick-1",
    source: "test",
    type: EVENT_TYPE_DRAW_UPDATE_REQUESTED,
    datacontenttype: "application/json",
    data: { gameId: GAME_ID_OTOSLOTTO },
  });

  await dispatchPipelineEvent(tick, {
    emit,
    fetcher,
    draws,
    lines,
    notifier,
    gameId: GAME_ID_OTOSLOTTO,
    locale: "hu",
  });

  assertEquals(sentMessages.length, 1);
  assertEquals(sentMessages[0]?.chatId, 99n);
  const expected = formatOtoslottoUserMessage(
    "hu",
    "2026-W12",
    [7, 18, 22, 52, 89],
    [{ numbers: [7, 18, 22, 52, 89] }],
    {
      5: "0 Ft",
      4: "2 494 605 Ft",
      3: "29 850 Ft",
      2: "3 385 Ft",
    },
  );
  assertEquals(sentMessages[0]?.text, expected);
});

Deno.test("dispatch ignores unknown event types (no port calls)", async () => {
  const noopEmit: EmitCloudEvent = async () => {};

  const fetcher: DrawResultFetcher = {
    fetchLatestOtoslottoDraw() {
      return Promise.reject(new Error("fetcher must not run"));
    },
  };

  const unknown = createCloudEvent({
    id: "x",
    source: "test",
    type: "com.example.unknown",
    data: {},
  });

  await dispatchPipelineEvent(unknown, {
    emit: noopEmit,
    fetcher,
    draws: {
      tryInsertDraw() {
        return Promise.reject(new Error("draws must not run"));
      },
      getLatestDraw() {
        return Promise.reject(new Error("draws must not run"));
      },
    },
    lines: {
      listUsersWithLines() {
        return Promise.reject(new Error("lines must not run"));
      },
      listLinesForUser() {
        return Promise.reject(new Error("lines must not run"));
      },
      addLine() {
        return Promise.reject(new Error("lines must not run"));
      },
      removeLine() {
        return Promise.reject(new Error("lines must not run"));
      },
    },
    notifier: {
      sendUserMessage() {
        return Promise.reject(new Error("notifier must not run"));
      },
    },
    gameId: GAME_ID_OTOSLOTTO,
    locale: "hu",
  });
});

Deno.test("event type constants are stable reverse-DNS strings", () => {
  assertEquals(EVENT_TYPE_DRAW_UPDATE_REQUESTED.endsWith(".v1"), true);
  assertEquals(EVENT_TYPE_DRAW_RESULT_PERSIST.endsWith(".v1"), true);
  assertEquals(EVENT_TYPE_DRAW_RESULT_STORED.endsWith(".v1"), true);
  assertEquals(EVENT_TYPE_USER_NOTIFICATION_REQUESTED.endsWith(".v1"), true);
});
