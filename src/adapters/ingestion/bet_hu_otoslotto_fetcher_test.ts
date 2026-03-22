import { assertEquals } from "jsr:@std/assert@1/equals";
import { BetHuOtoslottoFetcher, parseBetHuLottery5LastDraw } from "./bet_hu_otoslotto_fetcher.ts";

const sampleJson = {
  root: { Space: "", Local: "" },
  game: [
    {
      type: "LOTTO5",
      draw_id: 36126,
      title: "Ötöslottó",
      draw: {
        draw: { Space: "", Local: "" },
        date: "2026-03-21 19:25:00",
        "win-number-list": {
          "win-number-list": { Space: "", Local: "" },
          number: [
            { number: { Space: "", Local: "" }, type: "1", xml: "7" },
            { number: { Space: "", Local: "" }, type: "2", xml: "18" },
            { number: { Space: "", Local: "" }, type: "3", xml: "22" },
            { number: { Space: "", Local: "" }, type: "4", xml: "52" },
            { number: { Space: "", Local: "" }, type: "5", xml: "89" },
          ],
        },
      },
    },
  ],
};

Deno.test("parseBetHuLottery5LastDraw extracts draw_id and five xml numbers", () => {
  const p = parseBetHuLottery5LastDraw(sampleJson);
  assertEquals(p?.drawKey, "36126");
  assertEquals(p?.winningNumbers, [7, 18, 22, 52, 89]);
});

Deno.test("parseBetHuLottery5LastDraw returns null for empty game list", () => {
  assertEquals(parseBetHuLottery5LastDraw({ game: [] }), null);
  assertEquals(parseBetHuLottery5LastDraw(null), null);
});

Deno.test("BetHuOtoslottoFetcher uses fetchImpl and returns validated tuple", async () => {
  const fetcher = new BetHuOtoslottoFetcher({
    url: "https://example.test/json",
    fetchImpl: () =>
      Promise.resolve(
        new Response(JSON.stringify(sampleJson), {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
      ),
  });
  const r = await fetcher.fetchLatestOtoslottoDraw();
  assertEquals(r?.drawKey, "36126");
  assertEquals(r?.winningNumbers, [7, 18, 22, 52, 89]);
  assertEquals(typeof r?.resultSource, "string");
});
