import { OTOSLOTTO_MAX, OTOSLOTTO_MIN, OTOSLOTTO_PICK_COUNT } from "./constants.ts";

export type OtoslottoLine = readonly [number, number, number, number, number];

export type InvalidOtoslottoLineReason =
  | { readonly kind: "wrong_pick_count"; readonly expected: number }
  | { readonly kind: "not_distinct" }
  | { readonly kind: "out_of_range"; readonly min: number; readonly max: number };

export class InvalidOtoslottoLineError extends Error {
  constructor(public readonly reason: InvalidOtoslottoLineReason) {
    super(reason.kind);
    this.name = "InvalidOtoslottoLineError";
  }
}

/** Validates and returns a sorted tuple of five distinct numbers in [1,90]. */
export function parseOtoslottoLine(numbers: readonly number[]): OtoslottoLine {
  if (numbers.length !== OTOSLOTTO_PICK_COUNT) {
    throw new InvalidOtoslottoLineError({
      kind: "wrong_pick_count",
      expected: OTOSLOTTO_PICK_COUNT,
    });
  }
  const sorted = [...numbers].sort((a, b) => a - b);
  const set = new Set(sorted);
  if (set.size !== OTOSLOTTO_PICK_COUNT) {
    throw new InvalidOtoslottoLineError({ kind: "not_distinct" });
  }
  for (const n of sorted) {
    if (!Number.isInteger(n) || n < OTOSLOTTO_MIN || n > OTOSLOTTO_MAX) {
      throw new InvalidOtoslottoLineError({
        kind: "out_of_range",
        min: OTOSLOTTO_MIN,
        max: OTOSLOTTO_MAX,
      });
    }
  }
  const a = sorted[0]!;
  const b = sorted[1]!;
  const c = sorted[2]!;
  const d = sorted[3]!;
  const e = sorted[4]!;
  return [a, b, c, d, e];
}
