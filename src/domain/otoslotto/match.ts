import type { OtoslottoLine } from "./line.ts";

/** Count of matching integers between a played line and the official draw (order-independent). */
export function countHits(played: OtoslottoLine, winning: OtoslottoLine): number {
  let i = 0;
  let j = 0;
  let hits = 0;
  while (i < played.length && j < winning.length) {
    if (played[i] === winning[j]) {
      hits++;
      i++;
      j++;
    } else if (played[i] < winning[j]) {
      i++;
    } else {
      j++;
    }
  }
  return hits;
}
