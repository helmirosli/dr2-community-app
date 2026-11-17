import { useId, type ReactNode } from "react";

/**
 * A gradient progress ring that draws itself on load. Pure SVG (no client JS), so it works in server
 * components. `children` sit in the middle, e.g. a percentage.
 */
export function ProgressRing({
  value,
  max,
  size = 56,
  stroke = 7,
  className = "",
  children,
}: {
  value: number;
  max: number;
  size?: number;
  stroke?: number;
  className?: string;
  children?: ReactNode;
}) {
  // useId contains characters that are awkward inside url(#…), so keep only safe ones.
  const gradient = `ring-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const r = 30 - stroke / 2;
  const circumference = 2 * Math.PI * r;
  const ratio = max > 0 ? Math.min(1, Math.max(0, value / max)) : 0;

  return (
    <span className={`relative inline-grid shrink-0 place-items-center ${className}`} style={{ width: size, height: size }}>
      <svg viewBox="0 0 60 60" className="absolute inset-0 size-full -rotate-90" aria-hidden="true">
        <defs>
          <linearGradient id={gradient} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#8ee53f" />
            <stop offset="1" stopColor="#22c7f2" />
          </linearGradient>
        </defs>
        <circle cx="30" cy="30" r={r} fill="none" stroke="#e3e3e8" strokeWidth={stroke} />
        <circle
          cx="30"
          cy="30"
          r={r}
          fill="none"
          stroke={`url(#${gradient})`}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - ratio)}
          className="animate-ring"
          style={{ ["--ring" as string]: circumference }}
        />
      </svg>
      {children}
    </span>
  );
}
