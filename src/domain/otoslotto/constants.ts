/** Szerencsejáték Ötöslottó: five distinct numbers from 1..90 (inclusive). */
export const OTOSLOTTO_PICK_COUNT = 5;
export const OTOSLOTTO_MIN = 1;
export const OTOSLOTTO_MAX = 90;

export const GAME_ID_OTOSLOTTO = "otoslotto" as const;
export type GameIdOtoslotto = typeof GAME_ID_OTOSLOTTO;
