"use client";

import { useEffect, useRef } from "react";

export function TurnstileWidget() {
  const containerRef = useRef<HTMLDivElement>(null);

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
      if (typeof window !== "undefined") {
        const w = window as unknown as {
          turnstile?: {
            render: (id: string, opts: { sitekey: string; theme: string }) => void;
          };
        };
        if (w.turnstile) {
          w.turnstile.render("#turnstile-widget", {
            sitekey: siteKey,
            theme: "light",
          });
        }
      }
    };

    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
    };
  }, []);

  return (
    <div
      className="rounded-lg border border-slate-300"
      id="turnstile-widget"
      ref={containerRef}
    />
  );
}
