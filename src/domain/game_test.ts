import { assertEquals } from "jsr:@std/assert@1/equals";
import { assertThrows } from "jsr:@std/assert@1/throws";
import { GAME_ID_EUROJACKPOT } from "./eurojackpot/mod.ts";
import { GAME_ID_OTOSLOTTO } from "./otoslotto/mod.ts";
import {
  parseDrawPayloadForGame,
  parseLineForGame,
  parseSupportedGameId,
  serializeDrawPayloadForGame,
  serializeLineForGame,
} from "./game.ts";

Deno.test("parseSupportedGameId rejects unknown game ids", () => {
  assertThrows(() => parseSupportedGameId("unknown"), Error, "Unsupported GAME_ID");
});

Deno.test("line serialization and parsing supports otoslotto", () => {
  const line = parseLineForGame(GAME_ID_OTOSLOTTO, [7, 18, 22, 52, 89]);
  const json = serializeLineForGame(GAME_ID_OTOSLOTTO, line);
  assertEquals(JSON.parse(json), [7, 18, 22, 52, 89]);
});

Deno.test("line serialization and parsing supports eurojackpot", () => {
  const line = parseLineForGame(GAME_ID_EUROJACKPOT, { main: [1, 12, 21, 35, 50], euro: [2, 9] });
  const json = serializeLineForGame(GAME_ID_EUROJACKPOT, line);
  assertEquals(JSON.parse(json), { main: [1, 12, 21, 35, 50], euro: [2, 9] });
});

Deno.test("draw payload serialization and parsing roundtrip", () => {
  const payload = {
    winningNumbers: parseLineForGame(GAME_ID_EUROJACKPOT, {
      main: [1, 12, 21, 35, 50],
      euro: [2, 9],
    }),
    lastMaxWinPrize: "120 000 000 EUR",
  };
  const json = serializeDrawPayloadForGame(GAME_ID_EUROJACKPOT, payload);
  const parsed = parseDrawPayloadForGame(GAME_ID_EUROJACKPOT, JSON.parse(json));
  assertEquals(parsed, {
    ...payload,
    prizeAmountsByHits: undefined,
    nextPossibleMaxWinPrize: undefined,
  });
});
