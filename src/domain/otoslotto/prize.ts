export const OTOSLOTTO_PRIZE_HIT_COUNTS = [5, 4, 3, 2] as const;

export type OtoslottoPrizeHitCount = (typeof OTOSLOTTO_PRIZE_HIT_COUNTS)[number];

export type OtoslottoPrizeAmountsByHits = Partial<Record<OtoslottoPrizeHitCount, string>>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function normalizePrizeAmount(value: string): string | null {
  const normalized = value.replace(/\s+/g, " ").trim();
  return normalized.length > 0 ? normalized : null;
}

export function parseOtoslottoPrizeAmountsByHits(
  input: unknown,
): OtoslottoPrizeAmountsByHits | undefined {
  if (!isRecord(input)) {
    return undefined;
  }

  const output: OtoslottoPrizeAmountsByHits = {};
  for (const hitCount of OTOSLOTTO_PRIZE_HIT_COUNTS) {
    const rawAmount = input[String(hitCount)];
    if (typeof rawAmount !== "string") {
      continue;
    }
    const normalized = normalizePrizeAmount(rawAmount);
    if (!normalized) {
      continue;
    }
    output[hitCount] = normalized;
  }

  return Object.keys(output).length > 0 ? output : undefined;
}
