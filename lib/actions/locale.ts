"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { LOCALE_COOKIE, SUPPORTED_LOCALES, type Locale } from "@/lib/i18n/locale";

export async function setLocale(locale: string) {
  if (!SUPPORTED_LOCALES.includes(locale as Locale)) return;

  const cookieStore = await cookies();
  cookieStore.set(LOCALE_COOKIE, locale, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });

  revalidatePath("/", "layout");
}
