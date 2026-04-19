import { assertEquals } from "jsr:@std/assert@1/equals";
import { join } from "jsr:@std/path@1/join";
import { configureLogger } from "../../src/logging/mod.ts";
import { createCloudEvent } from "../../src/events/cloudevents.ts";
import { EVENT_TYPE_DRAW_UPDATE_REQUESTED } from "../../src/events/otoslotto_pipeline.ts";
import { GAME_ID_OTOSLOTTO } from "../../src/domain/otoslotto/mod.ts";
import type { DrawResultFetcher } from "../../src/ports/draw_result_fetcher.ts";
import type { OutboundNotifier } from "../../src/ports/outbound_notifier.ts";
import { createAppDatabase } from "../../src/adapters/persistence/drizzle/client.ts";
import { ensureSchema } from "../../src/adapters/persistence/drizzle/ensure_schema.ts";
import { DrizzleDrawRecordRepository } from "../../src/adapters/persistence/drizzle/draw_record_repository.ts";
import { DrizzlePlayedLineRepository } from "../../src/adapters/persistence/drizzle/played_line_repository.ts";
import { playedLines, users } from "../../src/adapters/persistence/drizzle/schema.ts";
import { createPipelineEmitter, dispatchPipelineEvent } from "../../src/application/dispatch.ts";
import { formatOtoslottoUserMessage } from "../../src/application/format_otoslotto_user_message.ts";

configureLogger({ format: "text", level: "error" });

/** Ötöslottó winning line 1–5: full pipeline with real SQLite + Drizzle (libSQL). */
Deno.test({
  name: "e2e: Ötöslottó draw 1,2,3,4,5 vs played line → 5 találat",
  sanitizeOps: false,
  sanitizeResources: false,
}, async () => {
  const tmpRoot = await Deno.makeTempDir();
  const dbFile = join(tmpRoot, "e2e.db");
  const databaseUrl = `file:${dbFile}`;

  try {
    await ensureSchema(databaseUrl);
    const db = createAppDatabase(databaseUrl);

    const userId = "e2e-user-1";
    const lineId = "e2e-line-1";
    const drawKey = "e2e-draw-otoslotto-1";
    const otoslottoFive = [1, 2, 3, 4, 5] as const;

    await db.insert(users).values({
      id: userId,
      telegramUserId: "424242",
      chatId: "777001",
      createdAt: new Date(),
    });

    await db.insert(playedLines).values({
      id: lineId,
      userId,
      gameId: GAME_ID_OTOSLOTTO,
      numbersJson: JSON.stringify([...otoslottoFive]),
      createdAt: new Date(),
    });

    const sentMessages: Array<{ chatId: bigint; text: string }> = [];

    const fetcher: DrawResultFetcher = {
      fetchLatestDraw() {
        return Promise.resolve({
          drawKey,
          winningNumbers: [...otoslottoFive],
          resultSource: "e2e",
          prizeAmountsByHits: {
            5: "123 456 789 Ft",
            4: "1 234 567 Ft",
            3: "30 000 Ft",
            2: "3 000 Ft",
          },
          lastMaxWinPrize: "123 456 789 Ft",
          nextPossibleMaxWinPrize: "4 294 967 295 Ft",
        });
      },
    };

    const draws = new DrizzleDrawRecordRepository(db);
    const lines = new DrizzlePlayedLineRepository(db);

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
      id: "e2e-tick-1",
      source: "e2e",
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
    assertEquals(sentMessages[0]?.chatId, 777001n);
    const expected = formatOtoslottoUserMessage(
      "hu",
      drawKey,
      [...otoslottoFive],
      [{ numbers: [...otoslottoFive] }],
      {
        5: "123 456 789 Ft",
        4: "1 234 567 Ft",
        3: "30 000 Ft",
        2: "3 000 Ft",
      },
      "123 456 789 Ft",
    );
    assertEquals(sentMessages[0]?.text, expected);
  } finally {
    await Deno.remove(tmpRoot, { recursive: true }).catch(() => {});
  }
});
