import Link from "next/link";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
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

function buildPageWindows(current: number, total: number): (number | "…")[] {
  if (total <= 1) return [1];

  const pages: (number | "…")[] = [];

  // Always first
  pages.push(1);

  // Window: current-1, current, current+1 (clamped, excluding 1 and total)
  const wStart = Math.max(2, current - 1);
  const wEnd   = Math.min(total - 1, current + 1);

  if (wStart > 2) pages.push("…");
  for (let p = wStart; p <= wEnd; p++) pages.push(p);
  if (wEnd < total - 1) pages.push("…");

  // Always last
  pages.push(total);

  return pages;
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

  const btnBase  = "inline-flex items-center justify-center rounded-lg border text-sm font-medium transition";
  const btnActive = `${btnBase} border-cyan-700 bg-cyan-700 text-white`;
  const btnIdle   = `${btnBase} border-slate-200 bg-white text-slate-700 hover:bg-slate-50`;
  const btnDisabled = `${btnBase} border-slate-100 text-slate-300 cursor-not-allowed`;

  return (
    <div className="flex flex-col gap-3 border-t border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
      {/* Left: count + per-page */}
      <div className="flex items-center gap-3 text-sm text-slate-500">
        <span>
          {totalCount === 0 ? "0" : `${rangeStart}–${rangeEnd}`} of {totalCount}
        </span>
        <PerPageSelect perPage={perPage} options={perPageOptions} />
      </div>

      {/* Right: navigation */}
      {totalPages > 1 && (
        <div className="flex items-center gap-1">
          {/* First */}
          {currentPage > 1 ? (
            <Link href={pageLink(1)} className={`${btnIdle} px-2 py-1.5`} title="First page">
              <ChevronsLeft size={15} />
            </Link>
          ) : (
            <span className={`${btnDisabled} px-2 py-1.5`}><ChevronsLeft size={15} /></span>
          )}

          {/* Previous */}
          {currentPage > 1 ? (
            <Link href={pageLink(currentPage - 1)} className={`${btnIdle} px-2 py-1.5`} title="Previous page">
              <ChevronLeft size={15} />
            </Link>
          ) : (
            <span className={`${btnDisabled} px-2 py-1.5`}><ChevronLeft size={15} /></span>
          )}

          {/* Page numbers */}
          {pages.map((p, i) =>
            p === "…" ? (
              <span key={`ellipsis-${i}`} className="px-1 text-sm text-slate-400">…</span>
            ) : p === currentPage ? (
              <span key={p} className={`${btnActive} min-w-9 px-2.5 py-1.5`}>{p}</span>
            ) : (
              <Link key={p} href={pageLink(p)} className={`${btnIdle} min-w-9 px-2.5 py-1.5`}>{p}</Link>
            )
          )}

          {/* Next */}
          {currentPage < totalPages ? (
            <Link href={pageLink(currentPage + 1)} className={`${btnIdle} px-2 py-1.5`} title="Next page">
              <ChevronRight size={15} />
            </Link>
          ) : (
            <span className={`${btnDisabled} px-2 py-1.5`}><ChevronRight size={15} /></span>
          )}

          {/* Last */}
          {currentPage < totalPages ? (
            <Link href={pageLink(totalPages)} className={`${btnIdle} px-2 py-1.5`} title="Last page">
              <ChevronsRight size={15} />
            </Link>
          ) : (
            <span className={`${btnDisabled} px-2 py-1.5`}><ChevronsRight size={15} /></span>
          )}
        </div>
      )}
    </div>
  );
}
