/**
 * Hungarian UI copy — single source for user-visible strings (Telegram, draw notifications).
 * Telegram HTML: <b> for emphasis; <code> only for numeric values (számok), not for /parancsok.
 */
export const huMessages = {
  "telegram.welcome":
    "<b>Üdvözöllek a Szerencsejáték értesítő botban.</b>\n\nItt elmentheted az Ötöslottó szelvényeid számait; ha megjelennek a hivatalos eredmények, értesítünk.\n\n<b>Parancsok</b>\n" +
    "• /add <code>1</code> <code>2</code> <code>3</code> <code>4</code> <code>5</code> — öt különböző szám (1–90) szóközzel\n" +
    "• /lines — mentett soraid listája\n" +
    "• /remove &lt;sorszám&gt; — törlés (a /lines szerinti sorszám, pl. /remove <code>1</code>)\n" +
    "• /result — utolsó rögzített eredmény; heti nyeremények és max nyeremény, valamint mentett szelvényeidre találatszám és egyező számok (növekvő)\n" +
    "• /jackpot — utolsó és következő várható max nyeremény (forrás: ...)\n" +
    "• /help — részletes útmutató",

  "telegram.help":
    "<b>Ötöslottó</b>\nMinden szelvényhez pontosan 5 különböző egész szám kell, mindegyik 1 és 90 között.\n\n<b>Parancsok</b>\n" +
    "/help — ez a részletes útmutató megjelenítése.\n\n" +
    "<b>Új szelvény</b>\n" +
    "/add <code>7</code> <code>14</code> <code>23</code> <code>41</code> <code>88</code>\n\n" +
    "<b>Szelvényeid</b>\n/lines — sorszámozott lista.\n\n" +
    "<b>Utolsó eredmény</b>\n/result — utolsó tárolt nyerőszámok, heti nyeremények és max nyeremény; ha van mentett szelvényed, soronként találat és egyező számok növekvő sorrendben.\n\n" +
    "<b>Jackpot</b>\n/jackpot — utolsó és következő várható max nyeremény (forrás: ...).\n\n" +
    "<b>Törlés</b>\n/remove <code>1</code> törli az 1. sort a listából (a /lines szerinti sorszámot).\n\n" +
    "A bot nem fogad fogadást; csak tárolja a megadott számokat és összeveti a nyerőszámokkal.",

  "telegram.last_draw_none":
    "Még nincs rögzített sorsolási eredmény. Amint a bot megkapja a hivatalos nyerőszámokat, itt is megjelennek — addig a /result üres marad.",

  "telegram.last_draw_source": "<b>Forrás:</b> {{source}}",
  "telegram.jackpot_title": "<b>Ötöslottó jackpot</b>",
  "telegram.jackpot_last": "Utolsó max nyeremény: {{amount}}",
  "telegram.jackpot_next": "Következő várható max nyeremény: {{amount}}",
  "telegram.jackpot_source": "<b>Forrás:</b> {{source}}",
  "telegram.jackpot_unavailable": "A jackpot adatok most nem érhetők el. Próbáld újra később.",

  "telegram.add_usage":
    "Használat: /add <code>1</code> <code>2</code> <code>3</code> <code>4</code> <code>5</code> — öt különböző szám 1 és 90 között.",

  "telegram.remove_usage": "Használat: /remove &lt;sorszám&gt; — előbb nézd meg a /lines listát.",

  "telegram.add_numbers_must_be_numeric": "Minden mezőnek számnak kell lennie.\n{{usage}}",

  "telegram.add_saved_label": "Mentve",

  "telegram.lines_empty":
    "Még nincs mentett szelvényed. Adj hozzá: /add <code>1</code> <code>2</code> <code>3</code> <code>4</code> <code>5</code>",

  "telegram.lines_title": "Mentett soraid",

  "telegram.remove_bad_index": "Nincs ilyen sorszám. Használd a /lines parancsot.",

  "telegram.remove_deleted_label": "Törölve",

  "telegram.remove_failed": "A sor nem törölhető (nem található).",

  "otoslotto.error_wrong_pick_count": "Ötöslottó: pontosan {{count}} szám szükséges.",

  "otoslotto.error_not_distinct": "Ötöslottó: a számoknak különbözőnek kell lenniük.",

  "otoslotto.error_out_of_range": "Ötöslottó: minden szám {{min}} és {{max}} között legyen.",

  "draw_result.title": "<b>Ötöslottó</b> — <code>{{drawKey}}</code>",

  "draw_result.winning_numbers_label": "Nyerőszámok",

  "draw_result.prizes_label": "Heti nyeremények",

  "draw_result.prize_line": "<b>{{hits}}</b> találat: {{amount}}",
  "draw_result.max_win_label": "Max nyeremény",
  "draw_result.max_win_line": "Utolsó max nyeremény: {{amount}}",

  "draw_result.line":
    "<b>{{index}}.</b> sor · <b>{{hits}}</b> találat · egyező (növ.): {{matched_asc}}\nSzelvény: {{numbers}}",
} as const;

export type MessageKey = keyof typeof huMessages;