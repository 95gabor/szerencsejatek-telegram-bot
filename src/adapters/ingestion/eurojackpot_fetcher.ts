import {
  type EurojackpotLine,
  InvalidEurojackpotLineError,
  parseEurojackpotLine,
} from "../../domain/eurojackpot/mod.ts";
import { getLogger } from "../../logging/mod.ts";
import type { DrawResultFetcher, FetchedDrawResult } from "../../ports/draw_result_fetcher.ts";

export const DEFAULT_EUROJACKPOT_RESULT_JSON_URL = "https://www.euro-jackpot.net/en/results";
export const DEFAULT_EUROJACKPOT_FALLBACK_HTML_URL =
  "https://www.magayo.com/lotto/hungary/eurojackpot-results/";

const RESULT_SOURCE_LABEL = "euro-jackpot.net results";
const RESULT_SOURCE_LABEL_FALLBACK =
  "magayo.com Hungary Eurojackpot results (third-party fallback)";

function parseEnglishDateToDrawKey(dateText: string): string | null {
  const normalizedDateText = dateText
    .trim()
    .replace(/^[A-Za-z]+,\s*/g, "")
    .replace(/^[A-Za-z]+\s+/g, "")
    .replace(/\s*\([^)]*\)\s*$/g, "")
    .replace(/\b(\d{1,2})\s+(st|nd|rd|th)\b/gi, "$1")
    .replace(/\b(\d{1,2})(st|nd|rd|th)\b/gi, "$1");
  const m = normalizedDateText.match(/^(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})$/);
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

function normalizePrizeAmount(value: string): string | undefined {
  const hasEuroSign = value.includes("€");
  const normalized = value
    .replaceAll("€", "")
    .replaceAll(",", " ")
    .replace(/\s+/g, " ")
    .trim();
  if (normalized.length === 0) return undefined;
  if (/\b[A-Z]{3}\b/.test(normalized)) {
    return normalized;
  }
  return hasEuroSign ? `${normalized} EUR` : undefined;
}

function extractJackpotAmount(text: string): string | undefined {
  if (text.trim().length === 0) return undefined;
  const amountMatch = text.match(/(?:€\s*)?[0-9][0-9\s,.]*/);
  if (!amountMatch) return undefined;
  return normalizePrizeAmount(amountMatch[0] ?? "");
}

export function parseEurojackpotLatestFromHtml(
  html: string,
): {
  drawKey: string;
  winningNumbers: EurojackpotLine;
  lastMaxWinPrize?: string;
  nextPossibleMaxWinPrize?: string;
} | null {
  const headingDate = html.match(/<h2[^>]*>[^<]*Results for\s+([^<]+)<\/h2>/i)?.[1];
  const dateDivRaw = html.match(/<div[^>]*class="[^"]*\bdate\b[^"]*"[^>]*>([\s\S]*?)<\/div>/i)?.[1];
  const dateDivText = dateDivRaw
    ?.replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const drawKey = parseEnglishDateToDrawKey(headingDate ?? dateDivText ?? "");
  if (!drawKey) {
    return null;
  }

  const mainBallNumbers = [...html.matchAll(/class="ball[^"]*">[\s\S]*?(\d{1,2})[\s\S]*?<\/li>/gi)]
    .map((m) => Number.parseInt(m[1] ?? "", 10))
    .filter((n) => Number.isInteger(n));
  const euroBallNumbers = [
    ...html.matchAll(/class="(?:euro-ball|euro)[^"]*">[\s\S]*?(\d{1,2})[\s\S]*?<\/li>/gi),
  ]
    .map((m) => Number.parseInt(m[1] ?? "", 10))
    .filter((n) => Number.isInteger(n));

  let main: number[];
  let euro: number[];
  if (mainBallNumbers.length >= 5 && euroBallNumbers.length >= 2) {
    main = mainBallNumbers.slice(0, 5);
    euro = euroBallNumbers.slice(0, 2);
  } else {
    const allBallNumbers = [...html.matchAll(/class="(?:ball|euro-ball)[^"]*">\s*(\d{1,2})\s*</gi)]
      .map((m) => Number.parseInt(m[1] ?? "", 10))
      .filter((n) => Number.isInteger(n));
    if (allBallNumbers.length < 7) {
      return null;
    }
    main = allBallNumbers.slice(0, 5);
    euro = allBallNumbers.slice(5, 7);
  }

  if (main.length < 5 || euro.length < 2) {
    return null;
  }
  let winningNumbers: EurojackpotLine;
  try {
    winningNumbers = parseEurojackpotLine({ main, euro });
  } catch {
    return null;
  }

  const nextPossibleMaxWinPrize = extractJackpotAmount(
    html.match(/\bnext\b[^<]{0,160}\bjackpot\b[^<]{0,200}/i)?.[0] ?? "",
  );
  const lastMaxWinPrize = extractJackpotAmount(
    html.match(/\b(?:last|previous)\b[^<]{0,160}\bjackpot\b[^<]{0,200}/i)?.[0] ?? "",
  );

  return {
    drawKey,
    winningNumbers,
    ...(lastMaxWinPrize ? { lastMaxWinPrize } : {}),
    ...(nextPossibleMaxWinPrize ? { nextPossibleMaxWinPrize } : {}),
  };
}

export function parseMagayoEurojackpotLatestFromHtml(
  html: string,
): {
  drawKey: string;
  winningNumbers: EurojackpotLine;
  lastMaxWinPrize?: string;
  nextPossibleMaxWinPrize?: string;
} | null {
  const anchor = html.indexOf("Latest EuroJackpot Results");
  const slice = anchor >= 0 ? html.slice(anchor, anchor + 9000) : html;
  const dateMatch = slice.match(/<h5>\s*([^<]+)\s*<\/h5>/i);
  const drawKey = parseEnglishDateToDrawKey(dateMatch?.[1] ?? "");
  if (!drawKey) {
    return null;
  }
  const main = [...slice.matchAll(/show_ball\.php\?p1=M(?:&amp;|&)p2=(\d{1,2})/gi)]
    .slice(0, 5)
    .map((m) => Number.parseInt(m[1] ?? "", 10));
  const euro = [...slice.matchAll(/show_ball\.php\?p1=B(?:&amp;|&)p2=(\d{1,2})/gi)]
    .slice(0, 2)
    .map((m) => Number.parseInt(m[1] ?? "", 10));
  if (main.length < 5 || euro.length < 2) {
    return null;
  }
  let winningNumbers: EurojackpotLine;
  try {
    winningNumbers = parseEurojackpotLine({ main, euro });
  } catch {
    return null;
  }
  const nextPossibleMaxWinPrize = extractJackpotAmount(
    slice.match(/\bNext\s+EuroJackpot\s+Jackpot\b[\s\S]{0,220}/i)?.[0] ?? "",
  );
  return {
    drawKey,
    winningNumbers,
    ...(nextPossibleMaxWinPrize ? { nextPossibleMaxWinPrize } : {}),
  };
}

export type EurojackpotFetcherOptions = {
  url: string;
  fallbackUrl?: string;
  fetchImpl?: typeof fetch;
};

export class EurojackpotFetcher implements DrawResultFetcher {
  private readonly url: string;
  private readonly fallbackUrl: string;
  private readonly fetchImpl: typeof fetch;

  constructor(options: EurojackpotFetcherOptions) {
    this.url = options.url;
    this.fallbackUrl = options.fallbackUrl ?? DEFAULT_EUROJACKPOT_FALLBACK_HTML_URL;
    this.fetchImpl = options.fetchImpl ?? globalThis.fetch;
  }

  private async fetchAndParse(
    url: string,
    resultSource: string,
  ): Promise<FetchedDrawResult | null> {
    const log = getLogger();
    let res: Response;
    try {
      res = await this.fetchImpl(url, {
        headers: {
          Accept: "text/html,application/json;q=0.9,*/*;q=0.8",
          "User-Agent": "szerencsejatek-telegram-bot/1.0 (Eurojackpot ingestion)",
        },
      });
    } catch (error) {
      log.warn("ingestion.eurojackpot.fetch_failed", {
        error: error instanceof Error ? error.message : String(error),
      });
      return null;
    }

    if (!res.ok) {
      log.warn("ingestion.eurojackpot.http_error", {
        status: res.status,
        statusText: res.statusText,
        responseUrl: res.url,
      });
      return null;
    }

    let html: string;
    try {
      html = await res.text();
    } catch (error) {
      log.warn("ingestion.eurojackpot.read_body_failed", {
        error: error instanceof Error ? error.message : String(error),
      });
      return null;
    }
    const parsed = parseEurojackpotLatestFromHtml(html) ??
      parseMagayoEurojackpotLatestFromHtml(html);
    if (!parsed) {
      log.warn("ingestion.eurojackpot.unexpected_shape", { responseUrl: res.url });
      return null;
    }

    try {
      const winningNumbers = parseEurojackpotLine({
        main: [...parsed.winningNumbers.main],
        euro: [...parsed.winningNumbers.euro],
      });
      return {
        drawKey: parsed.drawKey,
        winningNumbers,
        resultSource,
        lastMaxWinPrize: parsed.lastMaxWinPrize,
        nextPossibleMaxWinPrize: parsed.nextPossibleMaxWinPrize,
      };
    } catch (error) {
      if (error instanceof InvalidEurojackpotLineError) {
        log.warn("ingestion.eurojackpot.invalid_line", { kind: error.reason.kind });
        return null;
      }
      throw error;
    }
  }

  async fetchLatestDraw(): Promise<FetchedDrawResult | null> {
    const primary = await this.fetchAndParse(this.url, RESULT_SOURCE_LABEL);
    if (primary) {
      return primary;
    }
    return await this.fetchAndParse(this.fallbackUrl, RESULT_SOURCE_LABEL_FALLBACK);
  }
}
