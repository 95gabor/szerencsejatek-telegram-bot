import { countHits, type OtoslottoLine } from "../domain/otoslotto/mod.ts";
import type { Locale } from "../i18n/mod.ts";
import { t } from "../i18n/mod.ts";
import {
  escapeHtml,
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
    lineLines.push(
      t(locale, "draw_result.line", {
        index: lineIndex + 1,
        hits: hitCount,
        numbers: formatNumbersRowHtml(playedLine.numbers),
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
