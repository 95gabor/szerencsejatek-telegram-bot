import {
  InvalidOtoslottoLineError,
  type OtoslottoLine,
  parseOtoslottoLine,
} from "../../domain/otoslotto/mod.ts";
import { getLogger } from "../../logging/mod.ts";
import type { DrawResultFetcher } from "../../ports/draw_result_fetcher.ts";

/** Third-party fallback feed used as default source while operator endpoints are geo/IP-restricted. */
export const DEFAULT_OTOSLOTTO_RESULT_JSON_URL =
  "https://www.magayo.com/lotto/hungary/otoslotto-results/";
// Current official endpoint (kept for quick rollback/testing when reachable):
// https://bet.szerencsejatek.hu/cmsfiles/otos.html
// Legacy official JSON endpoint:
// https://bet.szerencsejatek.hu/PublicInfo/ResultJSON.aspx?game=LOTTO5&query=last

const RESULT_SOURCE_LABEL_JSON = "bet.szerencsejatek.hu PublicInfo ResultJSON (LOTTO5&query=last)";
const RESULT_SOURCE_LABEL_HTML = "bet.szerencsejatek.hu cmsfiles/otos.html";
const RESULT_SOURCE_LABEL_THIRD_PARTY =
  "magayo.com Hungary Otoslotto results (third-party fallback)";

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

function parseEnglishDateToDrawKey(dateText: string): string | null {
  const m = dateText.trim().match(/^(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})$/);
  if (!m) return null;
  const day = Number.parseInt(m[1] ?? "", 10);
  const monthName = (m[2] ?? "").toLowerCase();
  const year = Number.parseInt(m[3] ?? "", 10);
  const monthByName: Record<string, number> = {
    january: 1,
    february: 2,
    march: 3,
    april: 4,
    may: 5,
    june: 6,
    july: 7,
    august: 8,
    september: 9,
    october: 10,
    november: 11,
    december: 12,
  };
  const month = monthByName[monthName];
  if (!Number.isInteger(year) || !Number.isInteger(day) || !month || day < 1 || day > 31) {
    return null;
  }
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/**
 * Parses latest draw from `magayo.com/lotto/hungary/otoslotto-results/`.
 */
export function parseMagayoOtoslottoLatestFromHtml(
  html: string,
): { drawKey: string; winningNumbers: number[] } | null {
  const anchor = html.indexOf("Latest Otoslotto Results");
  const slice = anchor >= 0 ? html.slice(anchor, anchor + 7000) : html;
  const dateMatch =
    slice.match(/<h5>\s*([0-9]{1,2}\s+[A-Za-z]+\s+[0-9]{4})\s*\([^)]+\)\s*<\/h5>/i) ??
      slice.match(/<h5>\s*([0-9]{1,2}\s+[A-Za-z]+\s+[0-9]{4})\s*<\/h5>/i);
  const drawKey = parseEnglishDateToDrawKey(dateMatch?.[1] ?? "");
  if (!drawKey) {
    return null;
  }
  const winningNumbers = [...slice.matchAll(/show_ball\.php\?p1=M(?:&amp;|&)p2=(\d{1,2})/gi)]
    .slice(0, 5)
    .map((m) => Number.parseInt(m[1] ?? "", 10));
  if (winningNumbers.length !== 5 || winningNumbers.some((n) => !Number.isInteger(n))) {
    return null;
  }
  return { drawKey, winningNumbers };
}

export type BetHuOtoslottoFetcherOptions = {
  url: string;
  /** Injected for tests. */
  fetchImpl?: typeof fetch;
};

/**
 * Fetches latest Ötöslottó draw from configured source URL (official or third-party).
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
          Accept: "text/html,application/json;q=0.9,*/*;q=0.8",
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
      parsed = parseMagayoOtoslottoLatestFromHtml(body);
      resultSource = RESULT_SOURCE_LABEL_THIRD_PARTY;
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
