import { assertEquals } from "jsr:@std/assert@1/equals";
import { matchedNumbersAscending } from "./match.ts";

Deno.test("matchedNumbersAscending returns sorted intersection", () => {
  assertEquals(
    matchedNumbersAscending([88, 7, 22, 11, 44], [7, 18, 22, 52, 89]),
    [7, 22],
  );
});

Deno.test("matchedNumbersAscending empty when no overlap", () => {
  assertEquals(
    matchedNumbersAscending([1, 2, 3, 4, 5], [10, 20, 30, 40, 50]),
    [],
  );
});
