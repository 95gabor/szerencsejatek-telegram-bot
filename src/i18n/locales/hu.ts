/**
 * Hungarian UI copy — single source for user-visible strings (Telegram, draw notifications).
 * Telegram HTML: <b> for emphasis; <code> only for numeric values (számok), not for /parancsok.
 */
export const huMessages = {
  "telegram.welcome":
    "<b>Üdvözöllek a Szerencsejáték értesítő botban.</b>\n\nItt több játékhoz is elmentheted a szelvényeid számait; ha megjelennek a hivatalos eredmények, értesítünk.\n\n<b>Parancsok</b>\n" +
    "• /add otoslotto <code>1</code> <code>2</code> <code>3</code> <code>4</code> <code>5</code> — mentés játék szerint\n" +
    "• /add eurojackpot <code>1</code> <code>2</code> <code>3</code> <code>4</code> <code>5</code> <code>1</code> <code>2</code> — mentés játék szerint\n" +
    "• /lines [játék] — összes vagy csak az adott játék mentett sorai\n" +
    "• /remove &lt;játék&gt; &lt;sorszám&gt; — törlés adott játékon belüli index szerint\n" +
    "• /result [játék] — utolsó rögzített eredmény(ek) a mentett soraidhoz\n" +
    "• /jackpot — utolsó és következő várható max nyeremény (forrás: ...)\n" +
    "• /help — általános útmutató\n" +
    "• /help otoslotto | /help eurojackpot — játék-specifikus útmutató",
  "telegram.help_general":
    "<b>Szerencsejáték bot súgó</b>\n\n<b>Támogatott játékok</b>\n• otoslotto\n• eurojackpot\n\n<b>Alap parancsok</b>\n" +
    "/add &lt;játék&gt; &lt;számok...&gt;\n" +
    "/lines [játék]\n" +
    "/remove &lt;játék&gt; &lt;sorszám&gt;\n" +
    "/result [játék]\n" +
    "/jackpot\n\n" +
    "<b>Játék-specifikus súgó</b>\n" +
    "/help otoslotto\n" +
    "/help eurojackpot",
  "telegram.help":
    "<b>Ötöslottó</b>\nMinden szelvényhez pontosan 5 különböző egész szám kell, mindegyik 1 és 90 között.\n\n<b>Parancsok</b>\n" +
    "/help otoslotto — ez a részletes útmutató megjelenítése.\n\n" +
    "<b>Új szelvény</b>\n" +
    "/add otoslotto <code>7</code> <code>14</code> <code>23</code> <code>41</code> <code>88</code> — mentéskor a visszaigazolás tartalmazza a játék nevét.\n\n" +
    "<b>Szelvényeid</b>\n/lines — minden játék mentett sorai.\n/lines otoslotto — csak Ötöslottó sorok indexszel.\n\n" +
    "<b>Utolsó eredmény</b>\n/result — minden olyan játék eredménye, ahol van mentett sorod.\n/result otoslotto — csak Ötöslottó eredmény.\n\n" +
    "<b>Jackpot</b>\n/jackpot — utolsó és következő várható max nyeremény (forrás: ...).\n\n" +
    "<b>Törlés</b>\n/remove otoslotto <code>1</code> törli az Ötöslottó 1. sort (játékon belüli index), és a visszaigazolásban megjelenik a játék neve.\n\n" +
    "A bot nem fogad fogadást; csak tárolja a megadott számokat és összeveti a nyerőszámokkal.",
  "telegram.help_eurojackpot":
    "<b>Eurojackpot</b>\nMinden szelvényhez pontosan 5 különböző főszám kell (1–50), valamint 2 különböző euro szám (1–12).\n\n<b>Parancsok</b>\n" +
    "/help eurojackpot — ez a részletes útmutató megjelenítése.\n\n" +
    "<b>Új szelvény</b>\n" +
    "/add eurojackpot <code>7</code> <code>14</code> <code>23</code> <code>41</code> <code>50</code> <code>2</code> <code>11</code> — mentéskor a visszaigazolás tartalmazza a játék nevét.\n\n" +
    "<b>Szelvényeid</b>\n/lines — minden játék mentett sorai.\n/lines eurojackpot — csak Eurojackpot sorok indexszel.\n\n" +
    "<b>Utolsó eredmény</b>\n/result — minden olyan játék eredménye, ahol van mentett sorod.\n/result eurojackpot — csak Eurojackpot eredmény.\n\n" +
    "<b>Jackpot</b>\n/jackpot — utolsó és következő várható max nyeremény (forrás: ...).\n\n" +
    "<b>Törlés</b>\n/remove eurojackpot <code>1</code> törli az Eurojackpot 1. sort (játékon belüli index), és a visszaigazolásban megjelenik a játék neve.\n\n" +
    "A bot nem fogad fogadást; csak tárolja a megadott számokat és összeveti a nyerőszámokkal.",

  "telegram.last_draw_none":
    "Még nincs rögzített sorsolási eredmény. Amint a bot megkapja a hivatalos nyerőszámokat, itt is megjelennek — addig a /result üres marad.",
  "telegram.result_no_lines": "Nincs mentett sorod egyik játékhoz sem. Használd az /add parancsot.",

  "telegram.last_draw_source": "<b>Forrás:</b> {{source}}",
  "telegram.jackpot_title": "<b>Ötöslottó jackpot</b>",
  "telegram.jackpot_title_eurojackpot": "<b>Eurojackpot jackpot</b>",
  "telegram.jackpot_last": "Utolsó max nyeremény: {{amount}}",
  "telegram.jackpot_next": "Következő várható max nyeremény: {{amount}}",
  "telegram.jackpot_source": "<b>Forrás:</b> {{source}}",
  "telegram.jackpot_unavailable": "A jackpot adatok most nem érhetők el. Próbáld újra később.",

  "telegram.add_usage_multi":
    "Használat: /add otoslotto <code>1</code> <code>2</code> <code>3</code> <code>4</code> <code>5</code> vagy /add eurojackpot <code>1</code> <code>2</code> <code>3</code> <code>4</code> <code>5</code> <code>1</code> <code>2</code>.",

  "telegram.game_usage":
    "Érvénytelen játék. Használd: <code>otoslotto</code> vagy <code>eurojackpot</code>.",
  "telegram.help_usage": "Használat: /help vagy /help &lt;játék&gt; (otoslotto | eurojackpot).",
  "telegram.remove_usage_multi":
    "Használat: /remove &lt;játék&gt; &lt;sorszám&gt; — pl. /remove otoslotto <code>1</code>.",

  "telegram.add_numbers_must_be_numeric": "Minden mezőnek számnak kell lennie.\n{{usage}}",

  "telegram.add_saved_label": "Mentve",

  "telegram.lines_empty_multi":
    "Még nincs mentett szelvényed. Példa: /add otoslotto <code>1</code> <code>2</code> <code>3</code> <code>4</code> <code>5</code>",

  "telegram.lines_title": "Mentett soraid",
  "telegram.game_name_otoslotto": "Ötöslottó",
  "telegram.game_name_eurojackpot": "Eurojackpot",

  "telegram.remove_bad_index_multi":
    "Nincs ilyen sorszám ebben a játékban. Használd a /lines &lt;játék&gt; parancsot.",

  "telegram.remove_deleted_label": "Törölve",

  "telegram.remove_failed": "A sor nem törölhető (nem található).",

  "otoslotto.error_wrong_pick_count": "Ötöslottó: pontosan {{count}} szám szükséges.",

  "otoslotto.error_not_distinct": "Ötöslottó: a számoknak különbözőnek kell lenniük.",

  "otoslotto.error_out_of_range": "Ötöslottó: minden szám {{min}} és {{max}} között legyen.",
  "eurojackpot.error_wrong_main_pick_count": "Eurojackpot: pontosan {{count}} főszám szükséges.",
  "eurojackpot.error_wrong_euro_pick_count": "Eurojackpot: pontosan {{count}} euro szám szükséges.",
  "eurojackpot.error_main_not_distinct": "Eurojackpot: a főszámoknak különbözőnek kell lenniük.",
  "eurojackpot.error_euro_not_distinct":
    "Eurojackpot: az euro számoknak különbözőnek kell lenniük.",
  "eurojackpot.error_main_out_of_range":
    "Eurojackpot: minden főszám {{min}} és {{max}} között legyen.",
  "eurojackpot.error_euro_out_of_range":
    "Eurojackpot: minden euro szám {{min}} és {{max}} között legyen.",

  "draw_result.title": "<b>Ötöslottó</b> — <code>{{drawKey}}</code>",

  "draw_result.winning_numbers_label": "Nyerőszámok",

  "draw_result.prizes_label": "Heti nyeremények",

  "draw_result.prize_line": "<b>{{hits}}</b> találat: {{amount}}",
  "draw_result.max_win_label": "Max nyeremény",
  "draw_result.max_win_line": "Utolsó max nyeremény: {{amount}}",

  "draw_result.line":
    "<b>{{index}}.</b> sor · <b>{{game_name}}</b> · <b>{{hits}}</b> találat · egyező (növ.): {{matched_asc}}\nSzelvény: {{numbers}}",
  "draw_result.eurojackpot_title": "<b>Eurojackpot</b> — <code>{{drawKey}}</code>",
  "draw_result.eurojackpot_winning_main_label": "Nyerőszámok (fő)",
  "draw_result.eurojackpot_winning_euro_label": "Euro számok",
  "draw_result.eurojackpot_line":
    "<b>{{index}}.</b> sor · <b>{{game_name}}</b> · fő találat: <b>{{main_hits}}</b> · euro találat: <b>{{euro_hits}}</b>\nEgyező fő (növ.): {{matched_main_asc}}\nEgyező euro (növ.): {{matched_euro_asc}}\nSzelvény: {{main_numbers}} + {{euro_numbers}}",
} as const;

export type MessageKey = keyof typeof huMessages;
