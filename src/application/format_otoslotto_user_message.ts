import {
  countHits,
  matchedNumbersAscending,
  OTOSLOTTO_PRIZE_HIT_COUNTS,
  type OtoslottoLine,
  type OtoslottoPrizeAmountsByHits,
} from "../domain/otoslotto/mod.ts";
import type { Locale } from "../i18n/mod.ts";
import { t } from "../i18n/mod.ts";
import {
  codeHtml,
  escapeHtml,
  formatMatchedNumbersRowHtml,
  formatNumbersRowHtml,
  formatWinningNumbersListHtml,
} from "../telegram/html_format.ts";

function formatPrizeAmountHtml(amount: string): string {
  const normalized = amount.replace(/\s+/g, " ").trim();
  const parsed = normalized.match(/^([0-9][0-9 .]*)\s*([A-Za-z]+)$/u);
  if (!parsed) {
    return escapeHtml(normalized);
  }
  const numericPart = parsed[1]?.trim() ?? normalized;
  const suffixPart = parsed[2]?.trim() ?? "";
  return suffixPart.length > 0
    ? `${codeHtml(numericPart)} ${escapeHtml(suffixPart)}`
    : codeHtml(numericPart);
}

/** Builds localized HTML body for one user (all played lines for this draw). Telegram parse_mode HTML. */
export function formatOtoslottoUserMessage(
  locale: Locale,
  drawKey: string,
  winningNumbers: OtoslottoLine,
  playedLines: ReadonlyArray<{ numbers: OtoslottoLine }>,
  prizeAmountsByHits?: OtoslottoPrizeAmountsByHits,
  lastMaxWinPrize?: string,
): string {
  const prizeLines: string[] = [];
  for (const hitCount of OTOSLOTTO_PRIZE_HIT_COUNTS) {
    const amount = prizeAmountsByHits?.[hitCount];
    if (!amount) {
      continue;
    }
    prizeLines.push(
      t(locale, "draw_result.prize_line", {
        hits: hitCount,
        amount: formatPrizeAmountHtml(amount),
      }),
    );
  }

  const lineLines: string[] = [];
  for (let lineIndex = 0; lineIndex < playedLines.length; lineIndex++) {
    const playedLine = playedLines[lineIndex];
    const hitCount = countHits(playedLine.numbers, winningNumbers);
    const matchedAsc = matchedNumbersAscending(playedLine.numbers, winningNumbers);
    const matchedAscHtml = matchedAsc.length > 0 ? formatNumbersRowHtml(matchedAsc) : "—";
    lineLines.push(
      t(locale, "draw_result.line", {
        index: lineIndex + 1,
        hits: hitCount,
        matched_asc: matchedAscHtml,
        numbers: formatMatchedNumbersRowHtml(playedLine.numbers, winningNumbers),
      }),
    );
  }
  return [
    t(locale, "draw_result.title", { drawKey: escapeHtml(drawKey) }),
    "",
    `<b>${t(locale, "draw_result.winning_numbers_label")}</b>`,
    formatWinningNumbersListHtml(winningNumbers),
    "",
    `<b>${t(locale, "draw_result.max_win_label")}</b>`,
    t(locale, "draw_result.max_win_line", {
      amount: lastMaxWinPrize ? formatPrizeAmountHtml(lastMaxWinPrize) : "—",
    }),
    "",
    ...(prizeLines.length > 0
      ? [`<b>${t(locale, "draw_result.prizes_label")}</b>`, ...prizeLines, ""]
      : []),
    ...lineLines,
  ].join("\n");
}
