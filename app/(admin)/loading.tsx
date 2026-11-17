import { AdminPage } from "@/app/components/page-header";

/** Shown at once while a staff page fetches its data; the sidebar and header stay in place. */
export default function Loading() {
  const block = "animate-pulse rounded-[28px] motion-reduce:animate-none";
  return (
    <AdminPage>
      <div role="status" aria-busy="true" aria-live="polite" className="grid gap-6">
        <span className="sr-only">Loading…</span>
        <div className="grid gap-3">
          <div className="h-9 w-64 max-w-full animate-pulse rounded-full bg-black/10 motion-reduce:animate-none" />
          <div className="h-4 w-96 max-w-full animate-pulse rounded-full bg-black/5 motion-reduce:animate-none" />
        </div>
        <div className={`${block} h-56 bg-[var(--night)]/90`} />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className={`${block} h-28 bg-black/5`} />
          ))}
        </div>
        <div className={`${block} h-72 bg-black/5`} />
      </div>
    </AdminPage>
  );
}
