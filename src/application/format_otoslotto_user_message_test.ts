import { assertEquals } from "jsr:@std/assert@1/equals";
import { formatOtoslottoUserMessage } from "./format_otoslotto_user_message.ts";

Deno.test("formatOtoslottoUserMessage shows hit count, matched ascending, and full row", () => {
  const message = formatOtoslottoUserMessage(
    "hu",
    "2026-W12",
    [7, 18, 22, 52, 89],
    [{ numbers: [7, 11, 22, 44, 88] }],
  );

  assertEquals(
    message,
    [
      "<b>Ötöslottó</b> — <code>2026-W12</code>",
      "",
      "<b>Nyerőszámok</b>",
      "• <code>7</code>",
      "• <code>18</code>",
      "• <code>22</code>",
      "• <code>52</code>",
      "• <code>89</code>",
      "",
      "<b>1.</b> sor · <b>2</b> találat · egyező (növ.): <code>7</code> · <code>22</code>",
      "Szelvény: <b><code>7</code></b> · <code>11</code> · <b><code>22</code></b> · <code>44</code> · <code>88</code>",
    ].join("\n"),
  );
});

Deno.test("formatOtoslottoUserMessage uses em dash when zero hits on a line", () => {
  const message = formatOtoslottoUserMessage(
    "hu",
    "2026-W12",
    [7, 18, 22, 52, 89],
    [{ numbers: [1, 2, 3, 4, 5] }],
  );
  assertEquals(
    message.includes(
      "<b>1.</b> sor · <b>0</b> találat · egyező (növ.): —\nSzelvény:",
    ),
    true,
  );
});
