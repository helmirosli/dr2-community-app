"use client";

import { useEffect, useRef, useImperativeHandle, forwardRef } from "react";

export type TurnstileHandle = {
  reset: () => void;
};

export const TurnstileWidget = forwardRef<TurnstileHandle>(function TurnstileWidget(_, ref) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);

  useImperativeHandle(ref, () => ({
    reset() {
      const w = window as unknown as {
        turnstile?: { reset: (id: string) => void };
      };
      if (w.turnstile && widgetIdRef.current) {
        w.turnstile.reset(widgetIdRef.current);
      }
    },
  }));

  useEffect(() => {
    if (!containerRef.current) return;

    const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
    if (!siteKey) {
      console.error("NEXT_PUBLIC_TURNSTILE_SITE_KEY not configured");
      return;
    }

    const script = document.createElement("script");
    script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js";
    script.async = true;
    script.defer = true;

    script.onload = () => {
      const w = window as unknown as {
        turnstile?: {
          render: (id: string | HTMLElement, opts: { sitekey: string; theme: string }) => string;
        };
      };
      if (w.turnstile && containerRef.current) {
        widgetIdRef.current = w.turnstile.render(containerRef.current, {
          sitekey: siteKey,
          theme: "light",
        });
      }
    };

    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
    };
  }, []);

  return (
    <div
      className="rounded-lg"
      id="turnstile-widget"
      ref={containerRef}
    />
  );
});
