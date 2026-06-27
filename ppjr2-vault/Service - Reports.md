# Service — Reports

Part of [[Architecture Overview]] → [[Reports & Exports]].

**Sources:** [lib/reports/](lib/reports/)

---

## Responsibilities

Assembles financial data for monthly and yearly collection reports and hands it to PDF/Excel exporters. Four files cooperate:

---

## `lib/reports/monthly-data.ts`

Fetches and shapes raw data for a single month:
- All residents with their payment status for that month
- Aggregates `PaymentCoverage` rows per resident for the selected `(year, month)`
- Returns a structured list of residents with `amountPaid`, `status` per month

Used by both the web detail view (`/reports/monthly-detail`) and the export routes.

---

## `lib/reports/monthly.ts`

Builds the full monthly report structure:
- Summary totals (collected, outstanding, exempt, etc.)
- Per-resident payment grid for a given month
- Formats data ready for handoff to `exporters.ts`

---

## `lib/reports/year-grid-data.ts`

Builds the 12-column grid for a yearly view:
- Fetches coverage data for all 12 months of a given year in one query
- Returns a `resident × month` matrix — each cell: `PAID` / `PARTIAL` / `UNPAID` / `EXEMPT`
- Used by yearly PDF and Excel routes

---

## `lib/reports/exporters.ts`

Shared helpers for serialising report data into exportable formats:
- **PDF** via `pdfmake` — builds document definition, returns a `Buffer`
- **Excel** via `ExcelJS` — creates workbook/sheet, returns a `Buffer`

Both PDF and Excel routes stream the buffer as a binary HTTP response.

---

## Export Routes

| Route | Method | Output |
|---|---|---|
| `app/reports/monthly.pdf/route.ts` | GET | `application/pdf` |
| `app/reports/monthly.xlsx/route.ts` | GET | `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` |
| `app/reports/yearly.pdf/route.ts` | GET | `application/pdf` |
| `app/reports/yearly.xlsx/route.ts` | GET | `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` |

Query parameters (e.g. `?year=2025&month=6`) control which period is exported.

---

## File Upload Comparison Tool

`/reports/file-upload` — staff can upload a bank export CSV/Excel and compare against DB records:
- **PapaParse** parses CSV
- **xlsx** reads Excel sheets
- `lib/actions/file-upload.ts` handles the server action
- Results shown in `comparison-results.tsx`

---

## Related

- [[Reports & Exports]] — domain overview
- [[Data Model]] — `Payment`, `PaymentCoverage`, `Resident`
- [[Payment System]] — coverage data being reported on
