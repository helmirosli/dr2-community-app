"use client";

import { useTransition } from "react";
import { setLocale } from "@/lib/actions/locale";
import { useDictionary } from "@/lib/i18n/context";

export function LocaleToggle() {
  const { locale, t } = useDictionary();
  const [pending, startTransition] = useTransition();
  const nextLocale = locale === "en" ? "ms" : "en";

  return (
    <button
      aria-label={t.locale.switchLabel}
      className="rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-bold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
      disabled={pending}
      onClick={() => startTransition(() => setLocale(nextLocale))}
      type="button"
    >
      {t.locale.switchTo}
    </button>
  );
}
