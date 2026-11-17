import type { MonthState } from "@/lib/status";

/** Lamp colour ("r,g,b") for a house's state this month: the resident's own page and the AJK's page for that house match. */
export const LAMP_BY_STATE: Record<MonthState, string> = {
  paid: "142,229,63",
  ahead: "142,229,63",
  pending: "34,199,242",
  partial: "245,180,0",
  unpaid: "255,90,54",
  hold: "142,154,175",
  upcoming: "34,199,242",
};

const FIREFLIES = [
  { left: "22%", top: "80%", delay: "0s", color: "bg-[var(--lime)]" },
  { left: "70%", top: "74%", delay: "1.2s", color: "bg-[var(--cyan)]" },
  { left: "40%", top: "88%", delay: "2.3s", color: "bg-[var(--lime)]" },
  { left: "82%", top: "86%", delay: "3.1s", color: "bg-[var(--cyan)]" },
  { left: "58%", top: "92%", delay: "4s", color: "bg-[var(--lime)]" },
];

/**
 * The clay guardhouse: it drifts slowly, its lamp glows in `lamp` (an "r,g,b" triple) and an optional plate
 * sits on the door. Size it with `className` (width). Everything is decorative and stops under reduced motion.
 */
export function GuardhouseScene({ lamp, plate, fireflies = false, className = "" }: { lamp: string; plate?: string; fireflies?: boolean; className?: string }) {
  return (
    <div aria-hidden="true" className={`relative mx-auto aspect-square ${className}`}>
      <div className="absolute inset-0 [mask-image:radial-gradient(closest-side,#000_62%,transparent)]">
        <div className="animate-drift relative h-full w-full">
          {/* eslint-disable-next-line @next/next/no-img-element -- decorative art */}
          <img src="/art/a2-login.webp" alt="" className="h-full w-full object-cover object-[50%_72%]" />
          <span
            className="animate-glow absolute left-[49.5%] top-[37%] size-[46%] rounded-full"
            style={{ background: `radial-gradient(circle, rgb(${lamp}) 0, rgba(${lamp},0.85) 16%, rgba(${lamp},0.28) 42%, transparent 68%)` }}
          />
          {plate && (
            <span className="absolute left-[49.5%] top-[57%] grid min-w-[17%] -translate-x-1/2 -translate-y-1/2 place-items-center rounded-lg border border-white/25 bg-[linear-gradient(180deg,#1b2a55,#0b1636)] px-2 py-1 font-heading text-[clamp(1.1rem,5vw,1.6rem)] font-extrabold tabular-nums text-white shadow-[0_3px_0_#050a1a,0_8px_18px_rgba(0,0,0,.5)]">
              {plate}
            </span>
          )}
        </div>
      </div>
      {fireflies &&
        FIREFLIES.map((f) => (
          <span key={f.left} className={`animate-rise absolute size-1.5 rounded-full ${f.color}`} style={{ left: f.left, top: f.top, animationDelay: f.delay }} />
        ))}
    </div>
  );
}
