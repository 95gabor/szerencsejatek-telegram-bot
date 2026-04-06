import { assertEquals } from "jsr:@std/assert@1/equals";
import {
  BetHuOtoslottoFetcher,
  parseBetHuLottery5LastDraw,
  parseBetHuOtoslottoLatestFromHtml,
  parseMagayoOtoslottoLatestFromHtml,
} from "./bet_hu_otoslotto_fetcher.ts";

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

const sampleHtml = `
<!DOCTYPE html>
<html>
<body>
<table>
  <tr>
    <th>Év</th><th>Hét</th><th>Húzásdátum</th>
  </tr>
  <tr>
    <td>2026</td><td>14</td><td>2026.04.04.</td>
    <td>0</td><td>0 Ft</td><td>28</td><td>2 494 605 Ft</td><td>2563</td><td>29 850 Ft</td><td>85507</td><td>3 385 Ft</td>
    <td>36</td><td>45</td><td>50</td><td>67</td><td>77</td>
  </tr>
</table>
</body>
</html>
`;

const sampleMagayoHtml = `
<html>
<body>
  <h3>Latest Otoslotto Results</h3>
  <div class="row mt-3">
    <h5>4 April 2026 (Saturday)</h5>
    <p>
      <img src="/scripts/show_ball.php?p1=M&amp;p2=36" alt="" />
      <img src="/scripts/show_ball.php?p1=M&amp;p2=45" alt="" />
      <img src="/scripts/show_ball.php?p1=M&amp;p2=50" alt="" />
      <img src="/scripts/show_ball.php?p1=M&amp;p2=67" alt="" />
      <img src="/scripts/show_ball.php?p1=M&amp;p2=77" alt="" />
    </p>
  </div>
</body>
</html>
`;

Deno.test("parseBetHuLottery5LastDraw extracts draw_id and five xml numbers", () => {
  const p = parseBetHuLottery5LastDraw(sampleJson);
  assertEquals(p?.drawKey, "36126");
  assertEquals(p?.winningNumbers, [7, 18, 22, 52, 89]);
});

Deno.test("parseBetHuLottery5LastDraw returns null for empty game list", () => {
  assertEquals(parseBetHuLottery5LastDraw({ game: [] }), null);
  assertEquals(parseBetHuLottery5LastDraw(null), null);
});

Deno.test("parseBetHuOtoslottoLatestFromHtml extracts latest row values", () => {
  const p = parseBetHuOtoslottoLatestFromHtml(sampleHtml);
  assertEquals(p?.drawKey, "2026-14");
  assertEquals(p?.winningNumbers, [36, 45, 50, 67, 77]);
});

Deno.test("parseMagayoOtoslottoLatestFromHtml extracts latest row values", () => {
  const p = parseMagayoOtoslottoLatestFromHtml(sampleMagayoHtml);
  assertEquals(p?.drawKey, "2026-04-04");
  assertEquals(p?.winningNumbers, [36, 45, 50, 67, 77]);
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

Deno.test("BetHuOtoslottoFetcher falls back to html parser", async () => {
  const fetcher = new BetHuOtoslottoFetcher({
    url: "https://example.test/html",
    fetchImpl: () =>
      Promise.resolve(
        new Response(sampleHtml, {
          status: 200,
          headers: { "content-type": "text/html" },
        }),
      ),
  });
  const r = await fetcher.fetchLatestOtoslottoDraw();
  assertEquals(r?.drawKey, "2026-14");
  assertEquals(r?.winningNumbers, [36, 45, 50, 67, 77]);
  assertEquals(typeof r?.resultSource, "string");
});

Deno.test("BetHuOtoslottoFetcher parses magayo html source", async () => {
  const fetcher = new BetHuOtoslottoFetcher({
    url: "https://www.magayo.com/lotto/hungary/otoslotto-results/",
    fetchImpl: () =>
      Promise.resolve(
        new Response(sampleMagayoHtml, {
          status: 200,
          headers: { "content-type": "text/html" },
        }),
      ),
  });
  const r = await fetcher.fetchLatestOtoslottoDraw();
  assertEquals(r?.drawKey, "2026-04-04");
  assertEquals(r?.winningNumbers, [36, 45, 50, 67, 77]);
  assertEquals(typeof r?.resultSource, "string");
});
