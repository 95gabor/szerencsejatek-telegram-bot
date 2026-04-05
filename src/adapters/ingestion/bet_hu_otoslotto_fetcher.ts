import {
  InvalidOtoslottoLineError,
  type OtoslottoLine,
  parseOtoslottoLine,
} from "../../domain/otoslotto/mod.ts";
import { getLogger } from "../../logging/mod.ts";
import type { DrawResultFetcher } from "../../ports/draw_result_fetcher.ts";

/** Public Ötöslottó history table feed used as default source. */
export const DEFAULT_OTOSLOTTO_RESULT_JSON_URL = "https://bet.szerencsejatek.hu/cmsfiles/otos.html";
// Legacy endpoint kept for quick rollback/testing:
// https://bet.szerencsejatek.hu/PublicInfo/ResultJSON.aspx?game=LOTTO5&query=last

const RESULT_SOURCE_LABEL_JSON = "bet.szerencsejatek.hu PublicInfo ResultJSON (LOTTO5&query=last)";
const RESULT_SOURCE_LABEL_HTML = "bet.szerencsejatek.hu cmsfiles/otos.html";

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

function normalizeHtmlCellText(v: string): string {
  return v
    .replace(/<[^>]*>/g, " ")
    .replaceAll("&nbsp;", " ")
    .replaceAll("&#160;", " ")
    .replaceAll("&amp;", "&")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Parses latest draw from `cmsfiles/otos.html` (first data row in descending history table).
 */
export function parseBetHuOtoslottoLatestFromHtml(
  html: string,
): { drawKey: string; winningNumbers: number[] } | null {
  const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  for (const rowMatch of html.matchAll(rowRegex)) {
    const rowHtml = rowMatch[1] ?? "";
    const cells = [...rowHtml.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)]
      .map((m) => normalizeHtmlCellText(m[1] ?? ""));
    if (cells.length < 16) {
      continue;
    }
    const year = Number.parseInt(cells[0] ?? "", 10);
    const week = Number.parseInt(cells[1] ?? "", 10);
    if (!Number.isInteger(year) || !Number.isInteger(week) || week < 1 || week > 53) {
      continue;
    }
    const winningNumbers = cells.slice(-5).map((cell) => Number.parseInt(cell, 10));
    if (winningNumbers.length !== 5 || winningNumbers.some((n) => !Number.isInteger(n))) {
      continue;
    }
    return {
      drawKey: `${year}-${String(week).padStart(2, "0")}`,
      winningNumbers,
    };
  }
  return null;
}

export type BetHuOtoslottoFetcherOptions = {
  url: string;
  /** Injected for tests. */
  fetchImpl?: typeof fetch;
};

/**
 * Fetches latest Ötöslottó draw from operator public feeds.
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
        responseUrl: res.url,
      });
      return null;
    }

    let body: string;
    try {
      body = await res.text();
    } catch (e) {
      log.warn("ingestion.otoslotto.read_body_failed", {
        error: e instanceof Error ? e.message : String(e),
      });
      return null;
    }

    const contentType = res.headers.get("content-type") ?? "";
    let parsed: { drawKey: string; winningNumbers: number[] } | null = null;
    let resultSource = RESULT_SOURCE_LABEL_HTML;
    if (contentType.includes("json")) {
      try {
        const json = JSON.parse(body) as unknown;
        parsed = parseBetHuLottery5LastDraw(json);
        resultSource = RESULT_SOURCE_LABEL_JSON;
      } catch {
        parsed = null;
      }
    }
    if (!parsed) {
      parsed = parseBetHuOtoslottoLatestFromHtml(body);
      resultSource = RESULT_SOURCE_LABEL_HTML;
    }
    if (!parsed) {
      log.warn("ingestion.otoslotto.unexpected_shape", {
        contentType,
        responseUrl: res.url,
      });
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
      resultSource,
    };
  }
}
