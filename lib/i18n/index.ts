import "server-only";
import { cookies } from "next/headers";
import { DEFAULT_LOCALE, LOCALE_COOKIE, isValidLocale, type Locale } from "./locale";

const loaders = {
  en: () => import("./dictionaries/en").then((m) => m.default),
  ms: () => import("./dictionaries/ms").then((m) => m.default),
};

export async function getLocale(): Promise<Locale> {
  const cookieStore = await cookies();
  const raw = cookieStore.get(LOCALE_COOKIE)?.value;
  return isValidLocale(raw) ? raw : DEFAULT_LOCALE;
}

export async function getDictionary() {
  const locale = await getLocale();
  return loaders[locale]();
}

export type { Locale };
export type { Dictionary } from "./dictionaries/en";
