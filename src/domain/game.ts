import {
  type EurojackpotLine,
  GAME_ID_EUROJACKPOT,
  parseEurojackpotLine,
} from "./eurojackpot/mod.ts";
import { GAME_ID_OTOSLOTTO, type OtoslottoLine, parseOtoslottoLine } from "./otoslotto/mod.ts";

export type SupportedGameId = typeof GAME_ID_OTOSLOTTO | typeof GAME_ID_EUROJACKPOT;
export const SUPPORTED_GAME_IDS = [GAME_ID_OTOSLOTTO, GAME_ID_EUROJACKPOT] as const;

export type PlayedLine = OtoslottoLine | EurojackpotLine;
export type DrawWinningNumbers = OtoslottoLine | EurojackpotLine;
export type DrawWinningNumbersPayload =
  | readonly number[]
  | { main: readonly number[]; euro: readonly number[] };
export type PrizeAmountsByHits = Partial<Record<`${number}`, string>>;

export type DrawPayload = {
  winningNumbers: DrawWinningNumbers;
  prizeAmountsByHits?: PrizeAmountsByHits;
  lastMaxWinPrize?: string;
  nextPossibleMaxWinPrize?: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function parsePrimitiveNumberArray(value: unknown): number[] | null {
  if (!Array.isArray(value) || value.some((n) => typeof n !== "number")) {
    return null;
  }
  return value;
}

function parsePrizeAmountsByHits(input: unknown): PrizeAmountsByHits | undefined {
  if (!isRecord(input)) return undefined;
  const parsed: PrizeAmountsByHits = {};
  for (const [key, value] of Object.entries(input)) {
    if (typeof value !== "string") continue;
    const normalized = value.replace(/\s+/g, " ").trim();
    if (normalized.length === 0) continue;
    parsed[key as `${number}`] = normalized;
  }
  return Object.keys(parsed).length > 0 ? parsed : undefined;
}

function parseOptionalPrize(value: unknown): string | undefined {
  if (typeof value === "string") {
    const normalized = value.replace(/\s+/g, " ").trim();
    return normalized.length > 0 ? normalized : undefined;
  }
  if (typeof value === "number") {
    const normalized = String(value).replace(/\s+/g, " ").trim();
    return normalized.length > 0 ? normalized : undefined;
  }
  return undefined;
}

export function parseSupportedGameId(gameId: string): SupportedGameId {
  if (gameId === GAME_ID_OTOSLOTTO || gameId === GAME_ID_EUROJACKPOT) {
    return gameId;
  }
  throw new Error(`Unsupported GAME_ID: ${gameId}`);
}

export function parseLineForGame(gameId: SupportedGameId, payload: unknown): PlayedLine {
  if (gameId === GAME_ID_OTOSLOTTO) {
    const numbers = parsePrimitiveNumberArray(payload);
    if (!numbers) {
      throw new Error("Invalid otoslotto line payload");
    }
    return parseOtoslottoLine(numbers);
  }

  if (!isRecord(payload)) {
    throw new Error("Invalid eurojackpot line payload");
  }
  const main = parsePrimitiveNumberArray(payload.main);
  const euro = parsePrimitiveNumberArray(payload.euro);
  if (!main || !euro) {
    throw new Error("Invalid eurojackpot line payload");
  }
  return parseEurojackpotLine({ main, euro });
}

export function serializeLineForGame(gameId: SupportedGameId, line: PlayedLine): string {
  return JSON.stringify(toLinePayloadForGame(gameId, line));
}

export function toLinePayloadForGame(
  gameId: SupportedGameId,
  line: PlayedLine,
): DrawWinningNumbersPayload {
  if (gameId === GAME_ID_OTOSLOTTO) {
    return [...(line as OtoslottoLine)];
  }
  const euroLine = line as EurojackpotLine;
  return {
    main: [...euroLine.main],
    euro: [...euroLine.euro],
  };
}

export function parseDrawPayloadForGame(
  gameId: SupportedGameId,
  payload: unknown,
): DrawPayload {
  const parseFromLineOnlyPayload = (linePayload: unknown): DrawPayload => ({
    winningNumbers: parseLineForGame(gameId, linePayload) as DrawWinningNumbers,
  });

  if (Array.isArray(payload)) {
    return parseFromLineOnlyPayload(payload);
  }

  if (!isRecord(payload)) {
    throw new Error("Invalid draw payload");
  }

  if (!("winningNumbers" in payload)) {
    return parseFromLineOnlyPayload(payload);
  }

  const winningNumbersPayload = payload.winningNumbers;
  const winningNumbers = parseLineForGame(gameId, winningNumbersPayload);
  return {
    winningNumbers: winningNumbers as DrawWinningNumbers,
    prizeAmountsByHits: parsePrizeAmountsByHits(payload.prizeAmountsByHits),
    lastMaxWinPrize: parseOptionalPrize(payload.lastMaxWinPrize),
    nextPossibleMaxWinPrize: parseOptionalPrize(payload.nextPossibleMaxWinPrize),
  };
}

export function serializeDrawPayloadForGame(
  gameId: SupportedGameId,
  input: DrawPayload,
): string {
  const payload: Record<string, unknown> = {
    winningNumbers: toLinePayloadForGame(gameId, input.winningNumbers),
  };
  if (input.prizeAmountsByHits && Object.keys(input.prizeAmountsByHits).length > 0) {
    payload.prizeAmountsByHits = input.prizeAmountsByHits;
  }
  if (input.lastMaxWinPrize) {
    payload.lastMaxWinPrize = input.lastMaxWinPrize;
  }
  if (input.nextPossibleMaxWinPrize) {
    payload.nextPossibleMaxWinPrize = input.nextPossibleMaxWinPrize;
  }
  return JSON.stringify(payload);
}
