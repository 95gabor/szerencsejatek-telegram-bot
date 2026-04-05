import { assertEquals } from "jsr:@std/assert@1/equals";
import { Bot } from "grammy";
import { registerTelegramHandlers } from "./register_handlers.ts";
import type { DrawRecordRepository, PlayedLineRepository, UserRepository } from "../ports/mod.ts";

type SentMessage = { chatId: number; text: string };

function createDeps(sentMessages: SentMessage[]) {
  const users: UserRepository = {
    upsertUser() {
      return Promise.resolve({ id: "u-1" });
    },
  };
  const lines: PlayedLineRepository = {
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
  const draws: DrawRecordRepository = {
    tryInsertDraw() {
      return Promise.resolve(false);
    },
    getLatestDraw() {
      return Promise.resolve(null);
    },
  };
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
    gameId: "otoslotto",
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
  assertEquals(sentMessages[0]?.text.includes("<b>Ötöslottó</b>"), true);
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
