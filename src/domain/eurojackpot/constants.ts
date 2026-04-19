/** Eurojackpot: 5 main numbers (1..50) + 2 euro numbers (1..12). */
export const EUROJACKPOT_MAIN_PICK_COUNT = 5;
export const EUROJACKPOT_MAIN_MIN = 1;
export const EUROJACKPOT_MAIN_MAX = 50;

export const EUROJACKPOT_EURO_PICK_COUNT = 2;
export const EUROJACKPOT_EURO_MIN = 1;
export const EUROJACKPOT_EURO_MAX = 12;

export const GAME_ID_EUROJACKPOT = "eurojackpot" as const;
export type GameIdEurojackpot = typeof GAME_ID_EUROJACKPOT;
