import type { EurojackpotLine } from "./line.ts";

/** Intersection of played and winning numbers, sorted ascending. */
export function matchedNumbersAscending(
  played: readonly number[],
  winning: readonly number[],
): number[] {
  const win = new Set(winning);
  return [...played].filter((n) => win.has(n)).sort((a, b) => a - b);
}

/** Count of matching integers between sorted main/euro picks. */
function countHitsSorted(played: readonly number[], winning: readonly number[]): number {
  let i = 0;
  let j = 0;
  let hits = 0;
  while (i < played.length && j < winning.length) {
    if (played[i] === winning[j]) {
      hits++;
      i++;
      j++;
    } else if (played[i]! < winning[j]!) {
      i++;
    } else {
      j++;
    }
  }
  return hits;
}

export type EurojackpotHitCount = {
  mainHits: number;
  euroHits: number;
};

export function countEurojackpotHits(
  played: EurojackpotLine,
  winning: EurojackpotLine,
): EurojackpotHitCount {
  return {
    mainHits: countHitsSorted(played.main, winning.main),
    euroHits: countHitsSorted(played.euro, winning.euro),
  };
}

export function matchedMainNumbersAscending(
  played: readonly number[],
  winning: readonly number[],
): number[] {
  return matchedNumbersAscending(played, winning);
}

export function matchedEuroNumbersAscending(
  played: readonly number[],
  winning: readonly number[],
): number[] {
  return matchedNumbersAscending(played, winning);
}
