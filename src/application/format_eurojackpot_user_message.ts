import {
  countEurojackpotHits,
  type EurojackpotLine,
  matchedEuroNumbersAscending,
  matchedMainNumbersAscending,
} from "../domain/eurojackpot/mod.ts";
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

function formatEurojackpotWinningNumbersHtml(
  locale: Locale,
  winningNumbers: EurojackpotLine,
): string {
  return [
    `<b>${t(locale, "draw_result.eurojackpot_winning_main_label")}</b>`,
    formatWinningNumbersListHtml(winningNumbers.main),
    "",
    `<b>${t(locale, "draw_result.eurojackpot_winning_euro_label")}</b>`,
    formatWinningNumbersListHtml(winningNumbers.euro),
  ].join("\n");
}

/** Builds localized HTML body for one user (all played lines for this draw). */
export function formatEurojackpotUserMessage(
  locale: Locale,
  drawKey: string,
  winningNumbers: EurojackpotLine,
  playedLines: ReadonlyArray<{ numbers: EurojackpotLine }>,
  lastMaxWinPrize?: string,
): string {
  const lineLines: string[] = [];
  for (let lineIndex = 0; lineIndex < playedLines.length; lineIndex++) {
    const playedLine = playedLines[lineIndex];
    const hitCount = countEurojackpotHits(playedLine.numbers, winningNumbers);
    const matchedMainAsc = matchedMainNumbersAscending(
      playedLine.numbers.main,
      winningNumbers.main,
    );
    const matchedEuroAsc = matchedEuroNumbersAscending(
      playedLine.numbers.euro,
      winningNumbers.euro,
    );
    const matchedMainHtml = matchedMainAsc.length > 0 ? formatNumbersRowHtml(matchedMainAsc) : "—";
    const matchedEuroHtml = matchedEuroAsc.length > 0 ? formatNumbersRowHtml(matchedEuroAsc) : "—";
    lineLines.push(
      t(locale, "draw_result.eurojackpot_line", {
        index: lineIndex + 1,
        game_name: t(locale, "telegram.game_name_eurojackpot"),
        main_hits: hitCount.mainHits,
        euro_hits: hitCount.euroHits,
        matched_main_asc: matchedMainHtml,
        matched_euro_asc: matchedEuroHtml,
        main_numbers: formatMatchedNumbersRowHtml(playedLine.numbers.main, winningNumbers.main),
        euro_numbers: formatMatchedNumbersRowHtml(playedLine.numbers.euro, winningNumbers.euro),
      }),
    );
  }

  return [
    t(locale, "draw_result.eurojackpot_title", { drawKey: escapeHtml(drawKey) }),
    "",
    formatEurojackpotWinningNumbersHtml(locale, winningNumbers),
    "",
    `<b>${t(locale, "draw_result.max_win_label")}</b>`,
    t(locale, "draw_result.max_win_line", {
      amount: lastMaxWinPrize ? formatPrizeAmountHtml(lastMaxWinPrize) : "—",
    }),
    "",
    ...lineLines,
  ].join("\n");
}
