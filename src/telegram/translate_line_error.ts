import type { InvalidOtoslottoLineError } from "../domain/otoslotto/line.ts";
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
