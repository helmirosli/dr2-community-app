import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-50 px-6 py-10 text-slate-950">
      <div className="mx-auto grid max-w-5xl gap-10">
        <section className="grid gap-5">
          <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">DR2 Community</p>
          <h1 className="max-w-3xl text-4xl font-semibold tracking-tight md:text-5xl">
            Resident fee dashboard and public payment form
          </h1>
          <p className="max-w-2xl text-lg leading-8 text-slate-600">
            Track RM50 monthly fees, backdated payments, upfront payments, special collections, and resident submissions for admin/AJK review.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link className="rounded-md bg-slate-950 px-4 py-2 text-sm font-semibold text-white" href="/dashboard">
              Open dashboard
            </Link>
            <Link className="rounded-md border border-cyan-200 bg-white px-4 py-2 text-sm font-semibold text-cyan-800" href="/login">
              Admin login
            </Link>
            <Link className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-900" href="/submit">
              Resident form
            </Link>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          {[
            ["Flexible coverage", "Record current, backdated, or upfront payments by month range."],
            ["Pending review", "Public resident submissions never become official payments until approved."],
            ["SQLite foundation", "Prisma schema is ready for residents, payments, uploads, and reports."],
          ].map(([title, body]) => (
            <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm" key={title}>
              <h2 className="font-semibold">{title}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">{body}</p>
            </div>
          ))}
        </section>
      </div>
    </main>
  );
}
