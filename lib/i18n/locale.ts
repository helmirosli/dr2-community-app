export const LOCALE_COOKIE = "dr2_locale";
export const DEFAULT_LOCALE = "en";
export const SUPPORTED_LOCALES = ["en", "ms"] as const;
export type Locale = (typeof SUPPORTED_LOCALES)[number];

export function isValidLocale(value: string | undefined): value is Locale {
  return SUPPORTED_LOCALES.includes(value as Locale);
}
