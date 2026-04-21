import { assertEquals } from "jsr:@std/assert@1/equals";
import { Bot } from "grammy";
import { GAME_ID_EUROJACKPOT } from "../domain/eurojackpot/mod.ts";
import { GAME_ID_OTOSLOTTO } from "../domain/otoslotto/mod.ts";
import type { DrawResultFetcher } from "../ports/draw_result_fetcher.ts";
import { registerTelegramHandlers } from "./register_handlers.ts";
import type { DrawRecordRepository, PlayedLineRepository, UserRepository } from "../ports/mod.ts";

type SentMessage = { chatId: number; text: string };

type HandlerTestOverrides = {
  lines?: PlayedLineRepository;
  draws?: DrawRecordRepository;
  fetcher?: DrawResultFetcher;
  gameId?: string;
};

function createDeps(sentMessages: SentMessage[], overrides: HandlerTestOverrides = {}) {
  const users: UserRepository = {
    upsertUser() {
      return Promise.resolve({ id: "u-1" });
    },
  };
  const defaultLines: PlayedLineRepository = {
    listUsersWithLines() {
      return Promise.resolve([]);
    },
    listLinesForUser() {
      return Promise.resolve([]);
    },
    addLine() {
      return Promise.resolve({ id: "line-1" });
    },
    removeLine() {
      return Promise.resolve(false);
    },
  };
  const defaultDraws: DrawRecordRepository = {
    tryInsertDraw() {
      return Promise.resolve(false);
    },
    getLatestDraw() {
      return Promise.resolve(null);
    },
  };
  const defaultFetcher: DrawResultFetcher = {
    fetchLatestDraw() {
      return Promise.resolve(null);
    },
  };
  const lines = overrides.lines ?? defaultLines;
  const draws = overrides.draws ?? defaultDraws;
  const fetcher = overrides.fetcher ?? defaultFetcher;
  const bot = new Bot("123:TEST", {
    botInfo: {
      id: 123,
      is_bot: true,
      first_name: "Test Bot",
      username: "test_bot",
      can_join_groups: true,
      can_read_all_group_messages: false,
      supports_inline_queries: false,
      can_connect_to_business: false,
      has_main_web_app: false,
    },
  });
  bot.api.config.use((prev, method, payload, signal) => {
    if (method === "sendMessage") {
      const chatId = Number((payload as { chat_id: number | string }).chat_id);
      const text = String((payload as { text: string }).text);
      sentMessages.push({ chatId, text });
      return Promise.resolve({ ok: true, result: true } as never);
    }
    return prev(method, payload, signal);
  });
  registerTelegramHandlers(bot, {
    users,
    lines,
    draws,
    fetcher,
    gameId: overrides.gameId ?? "otoslotto",
    locale: "hu",
  });
  return bot;
}

Deno.test("non-command text gets help reply", async () => {
  const sentMessages: SentMessage[] = [];
  const bot = createDeps(sentMessages);
  await bot.handleUpdate({
    update_id: 1,
    message: {
      message_id: 1,
      date: Math.floor(Date.now() / 1000),
      text: "szia bot",
      from: { id: 42, is_bot: false, first_name: "Test" },
      chat: { id: 42, type: "private", first_name: "Test" },
    },
  });
  assertEquals(sentMessages.length, 1);
  assertEquals(sentMessages[0]?.chatId, 42);
  assertEquals(sentMessages[0]?.text.includes("Szerencsejáték bot súgó"), true);
});

Deno.test("command text does not trigger fallback help", async () => {
  const sentMessages: SentMessage[] = [];
  const bot = createDeps(sentMessages);
  await bot.handleUpdate({
    update_id: 2,
    message: {
      message_id: 2,
      date: Math.floor(Date.now() / 1000),
      text: "/help",
      from: { id: 55, is_bot: false, first_name: "Test" },
      chat: { id: 55, type: "private", first_name: "Test" },
      entities: [{ type: "bot_command", offset: 0, length: 5 }],
    },
  });
  assertEquals(sentMessages.length, 1);
});

Deno.test("/help without args returns general help", async () => {
  const sentMessages: SentMessage[] = [];
  const bot = createDeps(sentMessages);
  await bot.handleUpdate({
    update_id: 21,
    message: {
      message_id: 21,
      date: Math.floor(Date.now() / 1000),
      text: "/help",
      from: { id: 55, is_bot: false, first_name: "Test" },
      chat: { id: 55, type: "private", first_name: "Test" },
      entities: [{ type: "bot_command", offset: 0, length: 5 }],
    },
  });
  assertEquals(sentMessages.length, 1);
  assertEquals(sentMessages[0]?.text.includes("Szerencsejáték bot súgó"), true);
  assertEquals(sentMessages[0]?.text.includes("/help otoslotto"), true);
});

Deno.test("/help <game> returns game-specific help", async () => {
  const sentMessages: SentMessage[] = [];
  const bot = createDeps(sentMessages);
  await bot.handleUpdate({
    update_id: 22,
    message: {
      message_id: 22,
      date: Math.floor(Date.now() / 1000),
      text: "/help eurojackpot",
      from: { id: 56, is_bot: false, first_name: "Test" },
      chat: { id: 56, type: "private", first_name: "Test" },
      entities: [{ type: "bot_command", offset: 0, length: 5 }],
    },
  });
  assertEquals(sentMessages.length, 1);
  assertEquals(sentMessages[0]?.text.includes("<b>Eurojackpot</b>"), true);
});

Deno.test("/help with too many args returns usage", async () => {
  const sentMessages: SentMessage[] = [];
  const bot = createDeps(sentMessages);
  await bot.handleUpdate({
    update_id: 23,
    message: {
      message_id: 23,
      date: Math.floor(Date.now() / 1000),
      text: "/help otoslotto extra",
      from: { id: 57, is_bot: false, first_name: "Test" },
      chat: { id: 57, type: "private", first_name: "Test" },
      entities: [{ type: "bot_command", offset: 0, length: 5 }],
    },
  });
  assertEquals(sentMessages.length, 1);
  assertEquals(sentMessages[0]?.text.includes("Használat: /help"), true);
});

Deno.test("/result includes weekly prize amounts when available", async () => {
  const sentMessages: SentMessage[] = [];
  const draws: DrawRecordRepository = {
    tryInsertDraw() {
      return Promise.resolve(false);
    },
    getLatestDraw() {
      return Promise.resolve({
        gameId: "otoslotto",
        drawKey: "2026-14",
        winningNumbers: [36, 45, 50, 67, 77],
        resultSource: "test-source",
        lastMaxWinPrize: "0 Ft",
        prizeAmountsByHits: {
          5: "0 Ft",
          4: "2 494 605 Ft",
          3: "29 850 Ft",
          2: "3 385 Ft",
        },
      });
    },
  };
  const lines: PlayedLineRepository = {
    listUsersWithLines() {
      return Promise.resolve([]);
    },
    listLinesForUser(_userId, gameId) {
      if (gameId !== GAME_ID_OTOSLOTTO) {
        return Promise.resolve([]);
      }
      return Promise.resolve([
        { id: "line-1", userId: "u-1", gameId: GAME_ID_OTOSLOTTO, numbers: [36, 45, 50, 67, 77] },
      ]);
    },
    addLine() {
      return Promise.resolve({ id: "line-1" });
    },
    removeLine() {
      return Promise.resolve(false);
    },
  };
  const bot = createDeps(sentMessages, { draws, lines });

  await bot.handleUpdate({
    update_id: 3,
    message: {
      message_id: 3,
      date: Math.floor(Date.now() / 1000),
      text: "/result",
      from: { id: 66, is_bot: false, first_name: "Test" },
      chat: { id: 66, type: "private", first_name: "Test" },
      entities: [{ type: "bot_command", offset: 0, length: 7 }],
    },
  });

  assertEquals(sentMessages.length, 1);
  assertEquals(sentMessages[0]?.text.includes("Utolsó max nyeremény: <code>0</code> Ft"), true);
  assertEquals(sentMessages[0]?.text.includes("<b>Heti nyeremények</b>"), true);
  assertEquals(sentMessages[0]?.text.includes("<b>4</b> találat: <code>2 494 605</code> Ft"), true);
  assertEquals(sentMessages[0]?.text.includes("<b>Forrás:</b> test-source"), true);
});

Deno.test("/result aggregates games with played lines", async () => {
  const sentMessages: SentMessage[] = [];
  const draws: DrawRecordRepository = {
    tryInsertDraw() {
      return Promise.resolve(false);
    },
    getLatestDraw(gameId) {
      if (gameId === GAME_ID_OTOSLOTTO) {
        return Promise.resolve({
          gameId: GAME_ID_OTOSLOTTO,
          drawKey: "2026-14",
          winningNumbers: [1, 2, 3, 4, 5],
          resultSource: "source-o",
          lastMaxWinPrize: "0 Ft",
        });
      }
      return Promise.resolve({
        gameId: GAME_ID_EUROJACKPOT,
        drawKey: "2026-04-17",
        winningNumbers: { main: [1, 2, 3, 4, 5], euro: [1, 2] },
        resultSource: "source-e",
        lastMaxWinPrize: "100 EUR",
      });
    },
  };
  const lines: PlayedLineRepository = {
    listUsersWithLines() {
      return Promise.resolve([]);
    },
    listLinesForUser(_userId, gameId) {
      if (gameId === GAME_ID_OTOSLOTTO) {
        return Promise.resolve([{ id: "o1", userId: "u-1", gameId, numbers: [1, 2, 10, 11, 12] }]);
      }
      return Promise.resolve([
        {
          id: "e1",
          userId: "u-1",
          gameId: GAME_ID_EUROJACKPOT,
          numbers: { main: [1, 2, 10, 11, 12], euro: [1, 9] },
        },
      ]);
    },
    addLine() {
      return Promise.resolve({ id: "line-1" });
    },
    removeLine() {
      return Promise.resolve(false);
    },
  };
  const bot = createDeps(sentMessages, { draws, lines });

  await bot.handleUpdate({
    update_id: 30,
    message: {
      message_id: 30,
      date: Math.floor(Date.now() / 1000),
      text: "/result",
      from: { id: 66, is_bot: false, first_name: "Test" },
      chat: { id: 66, type: "private", first_name: "Test" },
      entities: [{ type: "bot_command", offset: 0, length: 7 }],
    },
  });

  assertEquals(sentMessages.length, 1);
  assertEquals(sentMessages[0]?.text.includes("<b>Ötöslottó</b>"), true);
  assertEquals(sentMessages[0]?.text.includes("<b>Eurojackpot</b>"), true);
  assertEquals(sentMessages[0]?.text.includes("<b>Forrás:</b> source-o"), true);
  assertEquals(sentMessages[0]?.text.includes("<b>Forrás:</b> source-e"), true);
});

Deno.test("/jackpot returns last and next possible max win prizes", async () => {
  const sentMessages: SentMessage[] = [];
  const fetcher: DrawResultFetcher = {
    fetchLatestDraw() {
      return Promise.resolve({
        drawKey: "2026-14",
        winningNumbers: [36, 45, 50, 67, 77],
        resultSource: "test-source",
        lastMaxWinPrize: "0 Ft",
        nextPossibleMaxWinPrize: "4 294 967 295 Ft",
      });
    },
  };
  const bot = createDeps(sentMessages, { fetcher });

  await bot.handleUpdate({
    update_id: 4,
    message: {
      message_id: 4,
      date: Math.floor(Date.now() / 1000),
      text: "/jackpot",
      from: { id: 77, is_bot: false, first_name: "Test" },
      chat: { id: 77, type: "private", first_name: "Test" },
      entities: [{ type: "bot_command", offset: 0, length: 8 }],
    },
  });

  assertEquals(sentMessages.length, 1);
  assertEquals(sentMessages[0]?.text.includes("<b>Ötöslottó jackpot</b>"), true);
  assertEquals(sentMessages[0]?.text.includes("Utolsó max nyeremény: <code>0</code> Ft"), true);
  assertEquals(
    sentMessages[0]?.text.includes(
      "Következő várható max nyeremény: <code>4 294 967 295</code> Ft",
    ),
    true,
  );
  assertEquals(sentMessages[0]?.text.includes("<b>Forrás:</b> test-source"), true);
});

Deno.test("/jackpot returns unavailable message when source has no jackpot info", async () => {
  const sentMessages: SentMessage[] = [];
  const fetcher: DrawResultFetcher = {
    fetchLatestDraw() {
      return Promise.resolve({
        drawKey: "2026-14",
        winningNumbers: [36, 45, 50, 67, 77],
        resultSource: "test-source",
      });
    },
  };
  const bot = createDeps(sentMessages, { fetcher });

  await bot.handleUpdate({
    update_id: 5,
    message: {
      message_id: 5,
      date: Math.floor(Date.now() / 1000),
      text: "/jackpot",
      from: { id: 88, is_bot: false, first_name: "Test" },
      chat: { id: 88, type: "private", first_name: "Test" },
      entities: [{ type: "bot_command", offset: 0, length: 8 }],
    },
  });

  assertEquals(sentMessages.length, 1);
  assertEquals(
    sentMessages[0]?.text,
    "A jackpot adatok most nem érhetők el. Próbáld újra később.",
  );
});

Deno.test("eurojackpot /add validates 7-number format and /lines renders plus separator", async () => {
  const sentMessages: SentMessage[] = [];
  const storedLines: Array<{ id: string; userId: string; gameId: string; numbers: unknown }> = [];
  const lines: PlayedLineRepository = {
    listUsersWithLines() {
      return Promise.resolve([]);
    },
    listLinesForUser(_userId, gameId) {
      return Promise.resolve(storedLines.filter((line) => line.gameId === gameId) as never);
    },
    addLine(input) {
      storedLines.push({
        id: "line-1",
        userId: input.userId,
        gameId: input.gameId,
        numbers: input.numbers,
      });
      return Promise.resolve({ id: "line-1" });
    },
    removeLine() {
      return Promise.resolve(false);
    },
  };
  const bot = createDeps(sentMessages, { lines, gameId: GAME_ID_EUROJACKPOT });

  await bot.handleUpdate({
    update_id: 6,
    message: {
      message_id: 6,
      date: Math.floor(Date.now() / 1000),
      text: "/add eurojackpot 7 14 23 41 50 2 11",
      from: { id: 99, is_bot: false, first_name: "Test" },
      chat: { id: 99, type: "private", first_name: "Test" },
      entities: [{ type: "bot_command", offset: 0, length: 4 }],
    },
  });

  await bot.handleUpdate({
    update_id: 7,
    message: {
      message_id: 7,
      date: Math.floor(Date.now() / 1000),
      text: "/lines",
      from: { id: 99, is_bot: false, first_name: "Test" },
      chat: { id: 99, type: "private", first_name: "Test" },
      entities: [{ type: "bot_command", offset: 0, length: 6 }],
    },
  });

  assertEquals(sentMessages.length, 2);
  assertEquals(sentMessages[0]?.text.includes("<b>Mentve</b> · <b>Eurojackpot</b>"), true);
  assertEquals(sentMessages[0]?.text.includes(" + "), true);
  assertEquals(sentMessages[1]?.text.includes("<b>Mentett soraid</b>"), true);
  assertEquals(sentMessages[1]?.text.includes("<code>line-1</code>"), false);
  assertEquals(sentMessages[1]?.text.includes("<b>Eurojackpot</b> · "), true);
  assertEquals(sentMessages[1]?.text.includes(" + "), true);
});

Deno.test("/remove uses game-scoped index", async () => {
  const sentMessages: SentMessage[] = [];
  const storedLines = [
    { id: "o-1", userId: "u-1", gameId: GAME_ID_OTOSLOTTO, numbers: [1, 2, 3, 4, 5] },
    {
      id: "e-1",
      userId: "u-1",
      gameId: GAME_ID_EUROJACKPOT,
      numbers: { main: [1, 2, 3, 4, 5], euro: [1, 2] },
    },
  ];
  const lines: PlayedLineRepository = {
    listUsersWithLines() {
      return Promise.resolve([]);
    },
    listLinesForUser(_userId, gameId) {
      return Promise.resolve(storedLines.filter((line) => line.gameId === gameId) as never);
    },
    addLine() {
      return Promise.resolve({ id: "unused" });
    },
    removeLine(_userId, lineId) {
      const idx = storedLines.findIndex((line) => line.id === lineId);
      if (idx === -1) return Promise.resolve(false);
      storedLines.splice(idx, 1);
      return Promise.resolve(true);
    },
  };
  const bot = createDeps(sentMessages, { lines });

  await bot.handleUpdate({
    update_id: 8,
    message: {
      message_id: 8,
      date: Math.floor(Date.now() / 1000),
      text: "/remove otoslotto 1",
      from: { id: 101, is_bot: false, first_name: "Test" },
      chat: { id: 101, type: "private", first_name: "Test" },
      entities: [{ type: "bot_command", offset: 0, length: 7 }],
    },
  });

  assertEquals(sentMessages.length, 1);
  assertEquals(sentMessages[0]?.text.includes("<b>Törölve</b> · <b>Ötöslottó</b>"), true);
});
