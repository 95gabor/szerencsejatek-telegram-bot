import { assertEquals } from "jsr:@std/assert@1/equals";
import {
  countEurojackpotHits,
  matchedEuroNumbersAscending,
  matchedMainNumbersAscending,
} from "./match.ts";

Deno.test("matched main/euro numbers are sorted intersections", () => {
  const played = { main: [50, 1, 14, 33, 20], euro: [12, 1] } as const;
  const winning = { main: [1, 14, 21, 33, 42], euro: [1, 11] } as const;

  assertEquals(matchedMainNumbersAscending(played.main, winning.main), [1, 14, 33]);
  assertEquals(matchedEuroNumbersAscending(played.euro, winning.euro), [1]);
});

Deno.test("countEurojackpotHits returns both hit dimensions", () => {
  const played = { main: [1, 2, 3, 4, 5], euro: [1, 2] } as const;
  const winning = { main: [1, 2, 42, 43, 44], euro: [2, 9] } as const;

  assertEquals(countEurojackpotHits(played, winning), { mainHits: 2, euroHits: 1 });
});
