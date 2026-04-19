import { assertEquals } from "jsr:@std/assert@1/equals";
import { formatEurojackpotUserMessage } from "./format_eurojackpot_user_message.ts";

Deno.test("formatEurojackpotUserMessage includes main/euro hit details", () => {
  const message = formatEurojackpotUserMessage(
    "hu",
    "2026-W12",
    { main: [3, 14, 27, 33, 50], euro: [2, 10] },
    [{ numbers: { main: [3, 11, 27, 44, 50], euro: [1, 10] } }],
    "3 000 000 000 Ft",
  );

  assertEquals(
    message,
    [
      "<b>Eurojackpot</b> — <code>2026-W12</code>",
      "",
      "<b>Nyerőszámok (fő)</b>",
      "• <code>3</code>",
      "• <code>14</code>",
      "• <code>27</code>",
      "• <code>33</code>",
      "• <code>50</code>",
      "",
      "<b>Euro számok</b>",
      "• <code>2</code>",
      "• <code>10</code>",
      "",
      "<b>Max nyeremény</b>",
      "Utolsó max nyeremény: <code>3 000 000 000</code> Ft",
      "",
      "<b>1.</b> sor · fő találat: <b>3</b> · euro találat: <b>1</b>",
      "Egyező fő (növ.): <code>3</code> · <code>27</code> · <code>50</code>",
      "Egyező euro (növ.): <code>10</code>",
      "Szelvény: <b><code>3</code></b> · <code>11</code> · <b><code>27</code></b> · <code>44</code> · <b><code>50</code></b> + <code>1</code> · <b><code>10</code></b>",
    ].join("\n"),
  );
});

Deno.test("formatEurojackpotUserMessage uses em dash when no hits", () => {
  const message = formatEurojackpotUserMessage(
    "hu",
    "2026-W12",
    { main: [3, 14, 27, 33, 50], euro: [2, 10] },
    [{ numbers: { main: [1, 4, 7, 8, 9], euro: [1, 12] } }],
  );
  assertEquals(message.includes("Egyező fő (növ.): —"), true);
  assertEquals(message.includes("Egyező euro (növ.): —"), true);
});
