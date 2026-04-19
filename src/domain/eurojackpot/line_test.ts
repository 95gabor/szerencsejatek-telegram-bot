import { assertEquals, assertThrows } from "jsr:@std/assert@1";
import { InvalidEurojackpotLineError, parseEurojackpotLine } from "./line.ts";

Deno.test("parseEurojackpotLine sorts and validates main/euro numbers", () => {
  const line = parseEurojackpotLine({
    main: [50, 1, 4, 18, 7],
    euro: [12, 2],
  });
  assertEquals(line, {
    main: [1, 4, 7, 18, 50],
    euro: [2, 12],
  });
});

Deno.test("parseEurojackpotLine rejects invalid main size", () => {
  const err = assertThrows(
    () =>
      parseEurojackpotLine({
        main: [1, 2, 3, 4],
        euro: [1, 2],
      }),
    InvalidEurojackpotLineError,
  );
  assertEquals(err.reason.kind, "wrong_main_pick_count");
});

Deno.test("parseEurojackpotLine rejects invalid euro range", () => {
  const err = assertThrows(
    () =>
      parseEurojackpotLine({
        main: [1, 2, 3, 4, 5],
        euro: [1, 20],
      }),
    InvalidEurojackpotLineError,
  );
  assertEquals(err.reason.kind, "euro_out_of_range");
});
