import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { PerPageSelect } from "./per-page-select";

type TablePaginationProps = {
  currentPage: number;
  totalPages: number;
  totalCount: number;
  perPage: number;
  rangeStart: number;
  rangeEnd: number;
  pageLink: (page: number) => string;
  perPageOptions?: number[];
};

/** 1 … 4 5 6 … 43 — first, last, and one page either side of the current one. */
function buildPageWindows(current: number, total: number): (number | "…")[] {
  if (total <= 1) return [1];
  const pages: (number | "…")[] = [1];
  const wStart = Math.max(2, current - 1);
  const wEnd = Math.min(total - 1, current + 1);
  if (wStart > 2) pages.push("…");
  for (let p = wStart; p <= wEnd; p++) pages.push(p);
  if (wEnd < total - 1) pages.push("…");
  pages.push(total);
  return pages;
}

const circle = "inline-grid size-9 place-items-center rounded-full text-sm font-semibold tabular-nums transition";
const idle = `${circle} text-[var(--ink)] hover:bg-black/5`;
const disabled = `${circle} text-[#d2d2d7]`;

function Arrow({ href, dir }: { href: string | null; dir: "prev" | "next" }) {
  const Icon = dir === "prev" ? ChevronLeft : ChevronRight;
  const label = dir === "prev" ? "Previous page" : "Next page";
  return href ? (
    <Link href={href} className={idle} aria-label={label}>
      <Icon size={18} aria-hidden="true" />
    </Link>
  ) : (
    <span className={disabled} aria-hidden="true">
      <Icon size={18} />
    </span>
  );
}

export function TablePagination({
  currentPage,
  totalPages,
  totalCount,
  perPage,
  rangeStart,
  rangeEnd,
  pageLink,
  perPageOptions = [10, 25, 50, 100],
}: TablePaginationProps) {
  const pages = buildPageWindows(currentPage, totalPages);
  const prev = currentPage > 1 ? pageLink(currentPage - 1) : null;
  const next = currentPage < totalPages ? pageLink(currentPage + 1) : null;

  return (
    <div className="flex items-center justify-between gap-3 border-t border-black/5 px-4 py-3 sm:px-5">
      {/* Count + page size */}
      <div className="flex min-w-0 items-center gap-3 text-[13px] text-[var(--ink-2)]">
        <span className="tabular-nums whitespace-nowrap">
          {totalCount === 0 ? "0" : `${rangeStart}–${rangeEnd}`} <span className="text-[#aeaeb2]">of</span> {totalCount}
        </span>
        <PerPageSelect perPage={perPage} options={perPageOptions} />
      </div>

      {totalPages > 1 && (
        <nav aria-label="Pagination" className="flex shrink-0 items-center">
          <Arrow href={prev} dir="prev" />

          {/* Phones: compact "3 / 43" */}
          <span className="px-2 text-sm font-semibold tabular-nums text-[var(--ink)] sm:hidden">
            {currentPage} <span className="font-normal text-[#aeaeb2]">/ {totalPages}</span>
          </span>

          {/* Wider screens: page numbers */}
          <span className="hidden items-center sm:flex">
            {pages.map((p, i) =>
              p === "…" ? (
                <span key={`gap-${i}`} className="w-6 text-center text-sm text-[#aeaeb2]" aria-hidden="true">
                  …
                </span>
              ) : p === currentPage ? (
                <span key={p} aria-current="page" className={`${circle} bg-[var(--ink)] text-white`}>
                  {p}
                </span>
              ) : (
                <Link key={p} href={pageLink(p)} className={idle} aria-label={`Page ${p}`}>
                  {p}
                </Link>
              ),
            )}
          </span>

          <Arrow href={next} dir="next" />
        </nav>
      )}
    </div>
  );
}
