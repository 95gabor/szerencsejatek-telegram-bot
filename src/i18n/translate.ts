import type { Locale } from "./locale.ts";
import { huMessages, type MessageKey } from "./locales/hu.ts";

function interpolate(
  template: string,
  params?: Record<string, string | number>,
): string {
  if (!params) return template;
  let out = template;
  for (const [k, v] of Object.entries(params)) {
    out = out.replaceAll(`{{${k}}}`, String(v));
  }
  return out;
}

/** Translates a key for the given locale. All user-visible copy must go through this. */
export function t(
  locale: Locale,
  key: MessageKey,
  params?: Record<string, string | number>,
): string {
  if (locale !== "hu") {
    throw new Error(`Unsupported locale: ${locale}`);
  }
  return interpolate(huMessages[key], params);
}
