import type { InvalidOtoslottoLineError } from "../domain/otoslotto/line.ts";
import type { InvalidEurojackpotLineError } from "../domain/eurojackpot/line.ts";
import type { Locale } from "../i18n/mod.ts";
import { t } from "../i18n/mod.ts";
import { codeHtml } from "./html_format.ts";

/** Maps domain validation to localized HTML user text (Telegram parse_mode HTML). */
export function translateInvalidOtoslottoLine(
  locale: Locale,
  error: InvalidOtoslottoLineError,
): string {
  switch (error.reason.kind) {
    case "wrong_pick_count":
      return t(locale, "otoslotto.error_wrong_pick_count", {
        count: codeHtml(error.reason.expected),
      });
    case "not_distinct":
      return t(locale, "otoslotto.error_not_distinct");
    case "out_of_range":
      return t(locale, "otoslotto.error_out_of_range", {
        min: codeHtml(error.reason.min),
        max: codeHtml(error.reason.max),
      });
  }
}

export function translateInvalidEurojackpotLine(
  locale: Locale,
  error: InvalidEurojackpotLineError,
): string {
  switch (error.reason.kind) {
    case "wrong_main_pick_count":
      return t(locale, "eurojackpot.error_wrong_main_pick_count", {
        count: codeHtml(error.reason.expected),
      });
    case "wrong_euro_pick_count":
      return t(locale, "eurojackpot.error_wrong_euro_pick_count", {
        count: codeHtml(error.reason.expected),
      });
    case "main_not_distinct":
      return t(locale, "eurojackpot.error_main_not_distinct");
    case "euro_not_distinct":
      return t(locale, "eurojackpot.error_euro_not_distinct");
    case "main_out_of_range":
      return t(locale, "eurojackpot.error_main_out_of_range", {
        min: codeHtml(error.reason.min),
        max: codeHtml(error.reason.max),
      });
    case "euro_out_of_range":
      return t(locale, "eurojackpot.error_euro_out_of_range", {
        min: codeHtml(error.reason.min),
        max: codeHtml(error.reason.max),
      });
  }
}
