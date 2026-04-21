import { assertEquals } from "jsr:@std/assert@1/equals";
import { EurojackpotFetcher, parseEurojackpotLatestFromHtml } from "./eurojackpot_fetcher.ts";

const sampleHtml = `
<!DOCTYPE html>
<html>
<body>
  <h2>Eurojackpot Results for Friday 17 April 2026</h2>
  <ul class="balls">
    <li class="ball">5</li>
    <li class="ball">11</li>
    <li class="ball">23</li>
    <li class="ball">38</li>
    <li class="ball">49</li>
  </ul>
  <ul class="euro-balls">
    <li class="euro-ball">2</li>
    <li class="euro-ball">10</li>
  </ul>
  <div>Next Jackpot: €120,000,000</div>
</body>
</html>
`;

Deno.test("parseEurojackpotLatestFromHtml parses main/euro numbers and draw date", () => {
  const parsed = parseEurojackpotLatestFromHtml(sampleHtml);
  assertEquals(parsed, {
    drawKey: "2026-04-17",
    winningNumbers: {
      main: [5, 11, 23, 38, 49],
      euro: [2, 10],
    },
    nextPossibleMaxWinPrize: "120 000 000 EUR",
  });
});

Deno.test("EurojackpotFetcher returns parsed payload via fetchImpl", async () => {
  const fetcher = new EurojackpotFetcher({
    url: "https://example.test/eurojackpot",
    fetchImpl: () =>
      Promise.resolve(
        new Response(sampleHtml, {
          status: 200,
          headers: { "content-type": "text/html" },
        }),
      ),
  });
  const parsed = await fetcher.fetchLatestDraw();
  assertEquals(parsed?.drawKey, "2026-04-17");
  assertEquals(parsed?.winningNumbers, { main: [5, 11, 23, 38, 49], euro: [2, 10] });
  assertEquals(parsed?.nextPossibleMaxWinPrize, "120 000 000 EUR");
});

Deno.test("EurojackpotFetcher falls back to Magayo URL when primary fails", async () => {
  const calls: string[] = [];
  const fetcher = new EurojackpotFetcher({
    url: "https://example.test/primary",
    fallbackUrl: "https://example.test/fallback",
    fetchImpl: (input) => {
      const url = String(input);
      calls.push(url);
      if (url.includes("/primary")) {
        return Promise.resolve(new Response("not found", { status: 404 }));
      }
      return Promise.resolve(
        new Response(sampleHtml, {
          status: 200,
          headers: { "content-type": "text/html" },
        }),
      );
    },
  });
  const parsed = await fetcher.fetchLatestDraw();
  assertEquals(calls, ["https://example.test/primary", "https://example.test/fallback"]);
  assertEquals(parsed?.drawKey, "2026-04-17");
  assertEquals(
    parsed?.resultSource,
    "magayo.com Hungary Eurojackpot results (third-party fallback)",
  );
});
