import type { EurojackpotLine } from "../domain/eurojackpot/mod.ts";
import { GAME_ID_OTOSLOTTO, type PlayedLine, type SupportedGameId } from "../domain/mod.ts";
import { formatNumbersRowHtml } from "./html_format.ts";

export function formatPlayedLineHtml(gameId: SupportedGameId, line: PlayedLine): string {
  if (gameId === GAME_ID_OTOSLOTTO) {
    return formatNumbersRowHtml(line as readonly number[]);
  }
  const euroLine = line as EurojackpotLine;
  return `${formatNumbersRowHtml(euroLine.main)} + ${formatNumbersRowHtml(euroLine.euro)}`;
}
