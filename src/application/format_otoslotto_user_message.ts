import { countHits, matchedNumbersAscending, type OtoslottoLine } from "../domain/otoslotto/mod.ts";
import type { Locale } from "../i18n/mod.ts";
import { t } from "../i18n/mod.ts";
import {
  escapeHtml,
  formatMatchedNumbersRowHtml,
  formatNumbersRowHtml,
  formatWinningNumbersListHtml,
} from "../telegram/html_format.ts";

/** Builds localized HTML body for one user (all played lines for this draw). Telegram parse_mode HTML. */
export function formatOtoslottoUserMessage(
  locale: Locale,
  drawKey: string,
  winningNumbers: OtoslottoLine,
  playedLines: ReadonlyArray<{ numbers: OtoslottoLine }>,
): string {
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
    ...lineLines,
  ].join("\n");
}
