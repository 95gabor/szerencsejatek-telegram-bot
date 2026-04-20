import {
  EUROJACKPOT_EURO_MAX,
  EUROJACKPOT_EURO_MIN,
  EUROJACKPOT_EURO_PICK_COUNT,
  EUROJACKPOT_MAIN_MAX,
  EUROJACKPOT_MAIN_MIN,
  EUROJACKPOT_MAIN_PICK_COUNT,
} from "./constants.ts";

export type EurojackpotMainLine = readonly [number, number, number, number, number];
export type EurojackpotEuroLine = readonly [number, number];
export type EurojackpotLine = {
  readonly main: EurojackpotMainLine;
  readonly euro: EurojackpotEuroLine;
};

export type InvalidEurojackpotLineReason =
  | { readonly kind: "wrong_main_pick_count"; readonly expected: number }
  | { readonly kind: "wrong_euro_pick_count"; readonly expected: number }
  | { readonly kind: "main_not_distinct" }
  | { readonly kind: "euro_not_distinct" }
  | { readonly kind: "main_out_of_range"; readonly min: number; readonly max: number }
  | { readonly kind: "euro_out_of_range"; readonly min: number; readonly max: number };

export class InvalidEurojackpotLineError extends Error {
  constructor(public readonly reason: InvalidEurojackpotLineReason) {
    super(reason.kind);
    this.name = "InvalidEurojackpotLineError";
  }
}

function parseDistinctSortedNumbers(
  numbers: readonly number[],
  expected: number,
  range: { min: number; max: number },
  reasons: {
    wrongPickCount: "wrong_main_pick_count" | "wrong_euro_pick_count";
    notDistinct: "main_not_distinct" | "euro_not_distinct";
    outOfRange: "main_out_of_range" | "euro_out_of_range";
  },
): number[] {
  if (numbers.length !== expected) {
    throw new InvalidEurojackpotLineError({
      kind: reasons.wrongPickCount,
      expected,
    });
  }
  const sorted = [...numbers].sort((a, b) => a - b);
  const set = new Set(sorted);
  if (set.size !== expected) {
    throw new InvalidEurojackpotLineError({ kind: reasons.notDistinct });
  }
  for (const n of sorted) {
    if (!Number.isInteger(n) || n < range.min || n > range.max) {
      throw new InvalidEurojackpotLineError({
        kind: reasons.outOfRange,
        min: range.min,
        max: range.max,
      });
    }
  }
  return sorted;
}

/** Validates and returns sorted main/euro picks according to Eurojackpot rules. */
export function parseEurojackpotLine(input: {
  main: readonly number[];
  euro: readonly number[];
}): EurojackpotLine {
  const main = parseDistinctSortedNumbers(
    input.main,
    EUROJACKPOT_MAIN_PICK_COUNT,
    { min: EUROJACKPOT_MAIN_MIN, max: EUROJACKPOT_MAIN_MAX },
    {
      wrongPickCount: "wrong_main_pick_count",
      notDistinct: "main_not_distinct",
      outOfRange: "main_out_of_range",
    },
  );
  const euro = parseDistinctSortedNumbers(
    input.euro,
    EUROJACKPOT_EURO_PICK_COUNT,
    { min: EUROJACKPOT_EURO_MIN, max: EUROJACKPOT_EURO_MAX },
    {
      wrongPickCount: "wrong_euro_pick_count",
      notDistinct: "euro_not_distinct",
      outOfRange: "euro_out_of_range",
    },
  );
  return {
    main: [main[0]!, main[1]!, main[2]!, main[3]!, main[4]!],
    euro: [euro[0]!, euro[1]!],
  };
}

/** `/add` format helper: first 5 numbers are main, last 2 are euro. */
export function parseEurojackpotLineFromFlatNumbers(numbers: readonly number[]): EurojackpotLine {
  return parseEurojackpotLine({
    main: numbers.slice(0, EUROJACKPOT_MAIN_PICK_COUNT),
    euro: numbers.slice(EUROJACKPOT_MAIN_PICK_COUNT),
  });
}
