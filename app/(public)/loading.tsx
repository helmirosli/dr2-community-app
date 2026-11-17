/** Shown at once while a public page fetches its data. */
export default function Loading() {
  return (
    <div role="status" aria-busy="true" aria-live="polite" className="mx-auto grid w-full max-w-4xl justify-items-center gap-5 px-4 pt-20">
      <span className="sr-only">Loading…</span>
      <div className="h-5 w-40 animate-pulse rounded-full bg-white/10 motion-reduce:animate-none" />
      <div className="h-14 w-full max-w-xl animate-pulse rounded-3xl bg-white/10 motion-reduce:animate-none" />
      <div className="h-14 w-full max-w-md animate-pulse rounded-full bg-white/10 motion-reduce:animate-none" />
      <div className="mt-8 h-64 w-full animate-pulse rounded-[28px] bg-white/5 motion-reduce:animate-none" />
    </div>
  );
}
