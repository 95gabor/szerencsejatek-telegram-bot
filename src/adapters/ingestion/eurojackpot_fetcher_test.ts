import { assertEquals } from "jsr:@std/assert@1/equals";
import {
  EurojackpotFetcher,
  parseEurojackpotLatestFromHtml,
  parseMagayoEurojackpotLatestFromHtml,
} from "./eurojackpot_fetcher.ts";

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

Deno.test("parseEurojackpotLatestFromHtml parses current euro-jackpot.net markup", () => {
  const html = `
<!DOCTYPE html>
<html><body>
  <div class="date sprite">Friday 17th April 2026</div>
  <ul class="balls">
    <li class="ball"><span>16</span></li>
    <li class="ball"><span>31</span></li>
    <li class="ball"><span>35</span></li>
    <li class="ball"><span>43</span></li>
    <li class="ball"><span>44</span></li>
    <li class="euro"><span>2</span></li>
    <li class="euro"><span>9</span></li>
  </ul>
</body></html>`;
  assertEquals(parseEurojackpotLatestFromHtml(html)?.drawKey, "2026-04-17");
  assertEquals(parseEurojackpotLatestFromHtml(html)?.winningNumbers, {
    main: [16, 31, 35, 43, 44],
    euro: [2, 9],
  });
});

Deno.test("parseMagayoEurojackpotLatestFromHtml parses magayo markup", () => {
  const html = `
<!DOCTYPE html>
<html><body>
  <h3>Latest EuroJackpot Results</h3>
  <h5>17 April 2026 (Friday)</h5>
  <p>
    <img src="/scripts/show_ball.php?p1=M&amp;p2=16" />
    <img src="/scripts/show_ball.php?p1=M&amp;p2=31" />
    <img src="/scripts/show_ball.php?p1=M&amp;p2=35" />
    <img src="/scripts/show_ball.php?p1=M&amp;p2=43" />
    <img src="/scripts/show_ball.php?p1=M&amp;p2=44" />
  </p>
  <p>EuroNumbers
    <img src="/scripts/show_ball.php?p1=B&amp;p2=02" />
    <img src="/scripts/show_ball.php?p1=B&amp;p2=09" />
  </p>
</body></html>`;
  assertEquals(parseMagayoEurojackpotLatestFromHtml(html), {
    drawKey: "2026-04-17",
    winningNumbers: {
      main: [16, 31, 35, 43, 44],
      euro: [2, 9],
    },
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
