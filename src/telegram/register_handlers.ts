import { trace } from "@opentelemetry/api";
import type { Bot } from "grammy";
import { formatEurojackpotUserMessage } from "../application/format_eurojackpot_user_message.ts";
import { formatOtoslottoUserMessage } from "../application/format_otoslotto_user_message.ts";
import {
  type EurojackpotLine,
  InvalidEurojackpotLineError,
  parseEurojackpotLineFromFlatNumbers,
} from "../domain/eurojackpot/mod.ts";
import {
  GAME_ID_OTOSLOTTO,
  parseSupportedGameId,
  type PlayedLine,
  type PrizeAmountsByHits,
  SUPPORTED_GAME_IDS,
  type SupportedGameId,
} from "../domain/mod.ts";
import {
  InvalidOtoslottoLineError,
  type OtoslottoLine,
  parseOtoslottoLine,
} from "../domain/otoslotto/mod.ts";
import type { Locale } from "../i18n/mod.ts";
import { t } from "../i18n/mod.ts";
import { getLogger } from "../logging/mod.ts";
import { telegramCommands } from "../observability/mod.ts";
import type {
  DrawRecordRepository,
  DrawResultFetcher,
  PlayedLineRepository,
  UserRepository,
} from "../ports/mod.ts";
import { codeHtml, escapeHtml } from "./html_format.ts";
import { formatPlayedLineHtml } from "./format_line_html.ts";
import { replyHtml } from "./reply_html.ts";
import {
  translateInvalidEurojackpotLine,
  translateInvalidOtoslottoLine,
} from "./translate_line_error.ts";

const tgTracer = trace.getTracer("telegram");

export type TelegramBotDeps = {
  users: UserRepository;
  lines: PlayedLineRepository;
  draws: DrawRecordRepository;
  fetcher: DrawResultFetcher;
  gameId: string;
  locale: Locale;
};

function commandArgs(text: string): string[] {
  const parts = text.trim().split(/\s+/).filter((p) => p.length > 0);
  if (parts.length === 0) return [];
  if (!isTelegramCommandText(text)) return [];
  return parts.slice(1);
}

export function isTelegramCommandText(text: string): boolean {
  const firstToken = text.trim().split(/\s+/, 1)[0] ?? "";
  return firstToken.startsWith("/");
}

function formatJackpotAmountHtml(amount: string): string {
  const normalized = amount.replace(/\s+/g, " ").trim();
  const parsed = normalized.match(/^([0-9][0-9 .]*)\s*([A-Za-z]+)$/u);
  if (!parsed) {
    return codeHtml(normalized);
  }
  const numericPart = parsed[1]?.trim() ?? normalized;
  const suffixPart = parsed[2]?.trim() ?? "";
  return suffixPart.length > 0
    ? `${codeHtml(numericPart)} ${escapeHtml(suffixPart)}`
    : codeHtml(numericPart);
}

function gameNameForMessage(locale: Locale, gameId: SupportedGameId): string {
  return t(
    locale,
    gameId === GAME_ID_OTOSLOTTO
      ? "telegram.game_name_otoslotto"
      : "telegram.game_name_eurojackpot",
  );
}

function tryParseGameId(raw: string | undefined): SupportedGameId | null {
  if (!raw) return null;
  try {
    return parseSupportedGameId(raw.toLowerCase());
  } catch {
    return null;
  }
}

export function registerTelegramHandlers(bot: Bot, deps: TelegramBotDeps): void {
  const { users, lines, draws, fetcher, gameId, locale } = deps;
  const supportedGameId = parseSupportedGameId(gameId);

  bot.use(async (ctx, next) => {
    await tgTracer.startActiveSpan("telegram.update", async (span) => {
      try {
        await next();
        const text = ctx.message?.text ?? "";
        const m = text.match(/^\/([\w]+)/);
        if (m?.[1]) {
          const cmd = m[1].toLowerCase();
          telegramCommands.add(1, { command: cmd });
          span.setAttribute("telegram.command", cmd);
          getLogger().info("telegram.handler", { command: cmd });
        }
      } catch (err) {
        span.recordException(err as Error);
        throw err;
      }
    });
  });

  function ensureUser(ctx: {
    from?: { id: number };
    chat?: { id: number };
  }): Promise<{ id: string } | null> {
    const from = ctx.from;
    const chat = ctx.chat;
    if (!from || !chat) return Promise.resolve(null);
    return users.upsertUser({
      telegramUserId: BigInt(from.id),
      chatId: BigInt(chat.id),
    });
  }

  bot.command("start", async (ctx) => {
    const u = await ensureUser(ctx);
    if (!u) return;
    await replyHtml(ctx, t(locale, "telegram.welcome"));
  });

  bot.command("help", async (ctx) => {
    const u = await ensureUser(ctx);
    if (!u) return;
    const args = commandArgs(ctx.message?.text ?? "");
    if (args.length === 0) {
      await replyHtml(ctx, t(locale, "telegram.help_general"));
      return;
    }
    if (args.length > 1) {
      await replyHtml(ctx, t(locale, "telegram.help_usage"));
      return;
    }
    const selectedGameId = tryParseGameId(args[0]);
    if (!selectedGameId) {
      await replyHtml(ctx, t(locale, "telegram.game_usage"));
      return;
    }
    await replyHtml(
      ctx,
      t(
        locale,
        selectedGameId === GAME_ID_OTOSLOTTO ? "telegram.help" : "telegram.help_eurojackpot",
      ),
    );
  });

  bot.command("result", async (ctx) => {
    const u = await ensureUser(ctx);
    if (!u) return;

    const args = commandArgs(ctx.message?.text ?? "");
    const selectedGameId = tryParseGameId(args[0]);
    if (args.length > 0 && !selectedGameId) {
      await replyHtml(ctx, t(locale, "telegram.game_usage"));
      return;
    }
    const gameIdsToShow = selectedGameId ? [selectedGameId] : [...SUPPORTED_GAME_IDS];
    const sections: string[] = [];
    for (const gameId of gameIdsToShow) {
      const playedLines = await lines.listLinesForUser(u.id, gameId);
      if (playedLines.length === 0) continue;
      const latest = await draws.getLatestDraw(gameId);
      if (!latest) {
        sections.push(
          `<b>${gameNameForMessage(locale, gameId)}</b>\n${t(locale, "telegram.last_draw_none")}`,
        );
        continue;
      }
      const body = formatUserDrawMessageByGame(
        gameId,
        locale,
        latest.drawKey,
        latest.winningNumbers,
        playedLines.map((line) => line.numbers),
        latest.prizeAmountsByHits,
        latest.lastMaxWinPrize,
      );
      sections.push([
        body,
        "",
        t(locale, "telegram.last_draw_source", { source: escapeHtml(latest.resultSource) }),
      ].join("\n"));
    }
    if (sections.length === 0) {
      await replyHtml(ctx, t(locale, "telegram.result_no_lines"));
      return;
    }
    await replyHtml(
      ctx,
      sections.join("\n\n"),
    );
  });

  bot.command("jackpot", async (ctx) => {
    const u = await ensureUser(ctx);
    if (!u) return;

    const latest = await fetcher.fetchLatestDraw();
    if (!latest) {
      await replyHtml(ctx, t(locale, "telegram.jackpot_unavailable"));
      return;
    }

    const lastMaxWinPrize = latest.lastMaxWinPrize;
    const nextPossibleMaxWinPrize = latest.nextPossibleMaxWinPrize;
    if (!lastMaxWinPrize && !nextPossibleMaxWinPrize) {
      await replyHtml(ctx, t(locale, "telegram.jackpot_unavailable"));
      return;
    }
    const rows: string[] = [
      t(
        locale,
        supportedGameId === GAME_ID_OTOSLOTTO
          ? "telegram.jackpot_title"
          : "telegram.jackpot_title_eurojackpot",
      ),
      "",
      t(locale, "telegram.jackpot_last", {
        amount: lastMaxWinPrize ? formatJackpotAmountHtml(lastMaxWinPrize) : "—",
      }),
      t(locale, "telegram.jackpot_next", {
        amount: nextPossibleMaxWinPrize ? formatJackpotAmountHtml(nextPossibleMaxWinPrize) : "—",
      }),
      "",
      t(locale, "telegram.jackpot_source", { source: escapeHtml(latest.resultSource) }),
    ];
    await replyHtml(ctx, rows.join("\n"));
  });

  bot.command("add", async (ctx) => {
    const u = await ensureUser(ctx);
    if (!u) return;

    const text = ctx.message?.text ?? "";
    const args = commandArgs(text);
    const selectedGameId = tryParseGameId(args[0]);
    if (args.length < 2 || !selectedGameId) {
      await replyHtml(ctx, t(locale, "telegram.add_usage_multi"));
      return;
    }
    const numberArgs = args.slice(1);

    const nums = numberArgs.map(Number);
    if (nums.some((n) => Number.isNaN(n))) {
      await replyHtml(
        ctx,
        t(locale, "telegram.add_numbers_must_be_numeric", {
          usage: t(locale, "telegram.add_usage_multi"),
        }),
      );
      return;
    }

    try {
      const line = parseLineFromArgsByGame(selectedGameId, nums);
      await lines.addLine({ userId: u.id, gameId: selectedGameId, numbers: line });
      const body = `<b>${t(locale, "telegram.add_saved_label")}</b> · <b>${
        gameNameForMessage(locale, selectedGameId)
      }</b>\n${formatPlayedLineHtml(selectedGameId, line)}`;
      await replyHtml(ctx, body);
    } catch (e) {
      if (e instanceof InvalidOtoslottoLineError) {
        await replyHtml(ctx, translateInvalidOtoslottoLine(locale, e));
        return;
      }
      if (e instanceof InvalidEurojackpotLineError) {
        await replyHtml(ctx, translateInvalidEurojackpotLine(locale, e));
        return;
      }
      throw e;
    }
  });

  bot.command("lines", async (ctx) => {
    const u = await ensureUser(ctx);
    if (!u) return;

    const args = commandArgs(ctx.message?.text ?? "");
    const selectedGameId = tryParseGameId(args[0]);
    if (args.length > 0 && !selectedGameId) {
      await replyHtml(ctx, t(locale, "telegram.game_usage"));
      return;
    }

    const gameIdsToShow = selectedGameId ? [selectedGameId] : [...SUPPORTED_GAME_IDS];
    const groups = await Promise.all(
      gameIdsToShow.map(async (gameId) => ({
        gameId,
        lines: await lines.listLinesForUser(u.id, gameId),
      })),
    );
    const nonEmptyGroups = groups.filter((group) => group.lines.length > 0);
    if (nonEmptyGroups.length === 0) {
      await replyHtml(ctx, t(locale, "telegram.lines_empty_multi"));
      return;
    }

    const sections = nonEmptyGroups.map((group) => {
      const rows = group.lines.map(
        (line, i) =>
          `<b>${i + 1}.</b> <code>${line.id}</code> · <b>${
            gameNameForMessage(locale, group.gameId)
          }</b> · ${formatPlayedLineHtml(group.gameId, line.numbers)}`,
      );
      return `<b>${gameNameForMessage(locale, group.gameId)}</b>\n${rows.join("\n")}`;
    });
    const body = `<b>${t(locale, "telegram.lines_title")}</b>\n\n${sections.join("\n\n")}`;
    await replyHtml(ctx, body);
  });

  bot.command("remove", async (ctx) => {
    const u = await ensureUser(ctx);
    if (!u) return;

    const text = ctx.message?.text ?? "";
    const args = commandArgs(text);
    const selectedGameId = tryParseGameId(args[0]);
    const idx = args.length > 1 ? Number(args[1]) : Number.NaN;
    if (!selectedGameId) {
      await replyHtml(ctx, t(locale, "telegram.remove_usage_multi"));
      return;
    }
    if (!Number.isInteger(idx) || idx < 1) {
      await replyHtml(ctx, t(locale, "telegram.remove_usage_multi"));
      return;
    }

    const list = await lines.listLinesForUser(u.id, selectedGameId);
    const line = list[idx - 1];
    if (!line) {
      await replyHtml(ctx, t(locale, "telegram.remove_bad_index_multi"));
      return;
    }

    const ok = await lines.removeLine(u.id, line.id);
    if (ok) {
      const body = `<b>${t(locale, "telegram.remove_deleted_label")}</b> · <b>${
        gameNameForMessage(locale, selectedGameId)
      }</b>\n${formatPlayedLineHtml(selectedGameId, line.numbers)}`;
      await replyHtml(ctx, body);
    } else {
      await replyHtml(ctx, t(locale, "telegram.remove_failed"));
    }
  });

  bot.on("message:text", async (ctx) => {
    const u = await ensureUser(ctx);
    if (!u) return;
    const text = ctx.message.text ?? "";
    if (isTelegramCommandText(text)) {
      return;
    }
    await replyHtml(
      ctx,
      t(locale, "telegram.help_general"),
    );
  });
}

function parseLineFromArgsByGame(gameId: SupportedGameId, args: readonly number[]): PlayedLine {
  if (gameId === GAME_ID_OTOSLOTTO) {
    return parseOtoslottoLine(args);
  }
  return parseEurojackpotLineFromFlatNumbers(args);
}

function formatUserDrawMessageByGame(
  gameId: SupportedGameId,
  locale: Locale,
  drawKey: string,
  winningNumbers: PlayedLine,
  playedLines: PlayedLine[],
  prizeAmountsByHits: PrizeAmountsByHits | undefined,
  lastMaxWinPrize: string | undefined,
): string {
  if (gameId === GAME_ID_OTOSLOTTO) {
    return formatOtoslottoUserMessage(
      locale,
      drawKey,
      winningNumbers as OtoslottoLine,
      playedLines.map((numbers) => ({ numbers: numbers as OtoslottoLine })),
      prizeAmountsByHits,
      lastMaxWinPrize,
    );
  }

  return formatEurojackpotUserMessage(
    locale,
    drawKey,
    winningNumbers as EurojackpotLine,
    playedLines.map((numbers) => ({ numbers: numbers as EurojackpotLine })),
    lastMaxWinPrize,
  );
}
