"use client";

import { useTransition } from "react";
import { setLocale } from "@/lib/actions/locale";
import { useDictionary } from "@/lib/i18n/context";

export function LocaleToggle({ dark = false }: { dark?: boolean }) {
  const { locale, t } = useDictionary();
  const [pending, startTransition] = useTransition();
  const nextLocale = locale === "en" ? "ms" : "en";

  return (
    <button
      aria-label={t.locale.switchLabel}
      className={`rounded-full px-2.5 py-1.5 text-xs font-bold transition disabled:opacity-50 ${
        dark ? "border border-white/20 text-white/85 hover:bg-white/10" : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
      }`}
      disabled={pending}
      onClick={() => startTransition(() => setLocale(nextLocale))}
      type="button"
    >
      {t.locale.switchTo}
    </button>
  );
}
