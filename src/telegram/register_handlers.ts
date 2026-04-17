import { trace } from "@opentelemetry/api";
import type { Bot } from "grammy";
import { formatOtoslottoUserMessage } from "../application/format_otoslotto_user_message.ts";
import { InvalidOtoslottoLineError, parseOtoslottoLine } from "../domain/otoslotto/mod.ts";
import type { Locale } from "../i18n/mod.ts";
import { t } from "../i18n/mod.ts";
import type {
  DrawRecordRepository,
  DrawResultFetcher,
  PlayedLineRepository,
  UserRepository,
} from "../ports/mod.ts";
import { codeHtml, escapeHtml, formatNumbersRowHtml } from "./html_format.ts";
import { replyHtml } from "./reply_html.ts";
import { getLogger } from "../logging/mod.ts";
import { telegramCommands } from "../observability/mod.ts";
import { translateInvalidOtoslottoLine } from "./translate_line_error.ts";

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

export function registerTelegramHandlers(bot: Bot, deps: TelegramBotDeps): void {
  const { users, lines, draws, fetcher, gameId, locale } = deps;

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
    await replyHtml(ctx, t(locale, "telegram.help"));
  });

  bot.command("result", async (ctx) => {
    const u = await ensureUser(ctx);
    if (!u) return;

    const latest = await draws.getLatestDraw(gameId);
    if (!latest) {
      await replyHtml(ctx, t(locale, "telegram.last_draw_none"));
      return;
    }

    const playedLines = await lines.listLinesForUser(u.id, gameId);
    const body = formatOtoslottoUserMessage(
      locale,
      latest.drawKey,
      latest.winningNumbers,
      playedLines,
      latest.prizeAmountsByHits,
      latest.lastMaxWinPrize,
    );
    const text = [
      body,
      "",
      t(locale, "telegram.last_draw_source", { source: escapeHtml(latest.resultSource) }),
    ].join("\n");
    await replyHtml(ctx, text);
  });

  bot.command("jackpot", async (ctx) => {
    const u = await ensureUser(ctx);
    if (!u) return;

    const latest = await fetcher.fetchLatestOtoslottoDraw();
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
      t(locale, "telegram.jackpot_title"),
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
    if (args.length === 0) {
      await replyHtml(ctx, t(locale, "telegram.add_usage"));
      return;
    }

    const nums = args.map((s) => Number(s));
    if (nums.some((n) => Number.isNaN(n))) {
      await replyHtml(
        ctx,
        t(locale, "telegram.add_numbers_must_be_numeric", {
          usage: t(locale, "telegram.add_usage"),
        }),
      );
      return;
    }

    try {
      const line = parseOtoslottoLine(nums);
      await lines.addLine({ userId: u.id, gameId, numbers: line });
      const body = `<b>${t(locale, "telegram.add_saved_label")}</b>\n${formatNumbersRowHtml(line)}`;
      await replyHtml(ctx, body);
    } catch (e) {
      if (e instanceof InvalidOtoslottoLineError) {
        await replyHtml(ctx, translateInvalidOtoslottoLine(locale, e));
        return;
      }
      throw e;
    }
  });

  bot.command("lines", async (ctx) => {
    const u = await ensureUser(ctx);
    if (!u) return;

    const list = await lines.listLinesForUser(u.id, gameId);
    if (list.length === 0) {
      await replyHtml(ctx, t(locale, "telegram.lines_empty"));
      return;
    }

    const rows = list.map(
      (line, i) => `<b>${i + 1}.</b> ${formatNumbersRowHtml(line.numbers)}`,
    );
    const body = `<b>${t(locale, "telegram.lines_title")}</b>\n\n${rows.join("\n")}`;
    await replyHtml(ctx, body);
  });

  bot.command("remove", async (ctx) => {
    const u = await ensureUser(ctx);
    if (!u) return;

    const text = ctx.message?.text ?? "";
    const args = commandArgs(text);
    const idx = args.length > 0 ? Number(args[0]) : NaN;
    if (!Number.isInteger(idx) || idx < 1) {
      await replyHtml(ctx, t(locale, "telegram.remove_usage"));
      return;
    }

    const list = await lines.listLinesForUser(u.id, gameId);
    const line = list[idx - 1];
    if (!line) {
      await replyHtml(ctx, t(locale, "telegram.remove_bad_index"));
      return;
    }

    const ok = await lines.removeLine(u.id, line.id);
    if (ok) {
      const body = `<b>${t(locale, "telegram.remove_deleted_label")}</b>\n${
        formatNumbersRowHtml(line.numbers)
      }`;
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
    await replyHtml(ctx, t(locale, "telegram.help"));
  });
}
