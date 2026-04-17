export type OtoslottoMaxWinPrizes = {
  lastMaxWinPrize?: string;
  nextPossibleMaxWinPrize?: string;
};

export function normalizeMaxWinPrize(value: string): string | undefined {
  const normalized = value.replace(/\s+/g, " ").trim();
  return normalized.length > 0 ? normalized : undefined;
}

function normalizeMaxWinPrizeUnknown(value: unknown): string | undefined {
  if (typeof value === "string") {
    return normalizeMaxWinPrize(value);
  }
  if (typeof value === "number") {
    return normalizeMaxWinPrize(String(value));
  }
  return undefined;
}

export function parseOtoslottoMaxWinPrizes(input: {
  lastMaxWinPrize?: unknown;
  nextPossibleMaxWinPrize?: unknown;
}): OtoslottoMaxWinPrizes | undefined {
  const lastMaxWinPrize = normalizeMaxWinPrizeUnknown(input.lastMaxWinPrize);
  const nextPossibleMaxWinPrize = normalizeMaxWinPrizeUnknown(input.nextPossibleMaxWinPrize);
  if (!lastMaxWinPrize && !nextPossibleMaxWinPrize) {
    return undefined;
  }
  return {
    ...(lastMaxWinPrize ? { lastMaxWinPrize } : {}),
    ...(nextPossibleMaxWinPrize ? { nextPossibleMaxWinPrize } : {}),
  };
}
