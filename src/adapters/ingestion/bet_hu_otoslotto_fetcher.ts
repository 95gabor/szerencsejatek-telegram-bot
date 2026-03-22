import {
  InvalidOtoslottoLineError,
  type OtoslottoLine,
  parseOtoslottoLine,
} from "../../domain/otoslotto/mod.ts";
import { getLogger } from "../../logging/mod.ts";
import type { DrawResultFetcher } from "../../ports/draw_result_fetcher.ts";

/** Public JSON feed used by bet.szerencsejatek.hu “lottószámok” (Ötöslottó = LOTTO5, latest draw). */
export const DEFAULT_OTOSLOTTO_RESULT_JSON_URL =
  "https://bet.szerencsejatek.hu/PublicInfo/ResultJSON.aspx?game=LOTTO5&query=last";

const RESULT_SOURCE_LABEL = "bet.szerencsejatek.hu PublicInfo ResultJSON (LOTTO5&query=last)";

function isRecord(v: unknown): v is Record<string, unknown> {
  return v !== null && typeof v === "object" && !Array.isArray(v);
}

/**
 * Parses the `game[]` entry for Ötöslottó from
 * `ResultJSON.aspx?game=LOTTO5&query=last` (structure may evolve — keep defensive).
 */
export function parseBetHuLottery5LastDraw(
  json: unknown,
): { drawKey: string; winningNumbers: number[] } | null {
  if (!isRecord(json)) return null;
  const games = json["game"];
  if (!Array.isArray(games) || games.length === 0) return null;

  const entry = games.find((g) => isRecord(g) && g["type"] === "LOTTO5");
  if (!isRecord(entry)) return null;

  const drawId = entry["draw_id"];
  if (typeof drawId !== "number" && typeof drawId !== "string") return null;
  const drawKey = String(drawId);

  const draw = entry["draw"];
  if (!isRecord(draw)) return null;

  const wnl = draw["win-number-list"];
  if (!isRecord(wnl)) return null;

  const rawNumbers = wnl["number"];
  if (!Array.isArray(rawNumbers) || rawNumbers.length !== 5) return null;

  const winningNumbers: number[] = [];
  for (const item of rawNumbers) {
    if (!isRecord(item)) return null;
    const xml = item["xml"];
    if (typeof xml !== "string") return null;
    const n = Number(xml);
    if (!Number.isInteger(n)) return null;
    winningNumbers.push(n);
  }

  return { drawKey, winningNumbers };
}

export type BetHuOtoslottoFetcherOptions = {
  url: string;
  /** Injected for tests. */
  fetchImpl?: typeof fetch;
};

/**
 * Fetches latest Ötöslottó (LOTTO5) draw from the operator’s public JSON endpoint.
 */
export class BetHuOtoslottoFetcher implements DrawResultFetcher {
  private readonly url: string;
  private readonly fetchImpl: typeof fetch;

  constructor(options: BetHuOtoslottoFetcherOptions) {
    this.url = options.url;
    this.fetchImpl = options.fetchImpl ?? globalThis.fetch;
  }

  async fetchLatestOtoslottoDraw(): Promise<
    {
      drawKey: string;
      winningNumbers: OtoslottoLine;
      resultSource: string;
    } | null
  > {
    const log = getLogger();
    let res: Response;
    try {
      res = await this.fetchImpl(this.url, {
        headers: {
          Accept: "application/json",
          "User-Agent": "szerencsejatek-telegram-bot/1.0 (Ötöslottó ingestion)",
        },
      });
    } catch (e) {
      log.warn("ingestion.otoslotto.fetch_failed", {
        error: e instanceof Error ? e.message : String(e),
      });
      return null;
    }

    if (!res.ok) {
      log.warn("ingestion.otoslotto.http_error", {
        status: res.status,
        statusText: res.statusText,
      });
      return null;
    }

    let json: unknown;
    try {
      json = await res.json();
    } catch (e) {
      log.warn("ingestion.otoslotto.json_parse_failed", {
        error: e instanceof Error ? e.message : String(e),
      });
      return null;
    }

    const parsed = parseBetHuLottery5LastDraw(json);
    if (!parsed) {
      log.warn("ingestion.otoslotto.unexpected_shape", {});
      return null;
    }

    let winningNumbers: OtoslottoLine;
    try {
      winningNumbers = parseOtoslottoLine([...parsed.winningNumbers]);
    } catch (e) {
      if (e instanceof InvalidOtoslottoLineError) {
        log.warn("ingestion.otoslotto.invalid_line", { kind: e.reason.kind });
        return null;
      }
      throw e;
    }

    return {
      drawKey: parsed.drawKey,
      winningNumbers,
      resultSource: RESULT_SOURCE_LABEL,
    };
  }
}
