# Reports & Exports

Part of [[Architecture Overview]]. Related: [[Payment System]], [[Data Model]].

---

## Overview

The app generates financial reports for monthly and yearly collection summaries, exportable as **PDF** or **Excel**.

---

## Report Routes

| Route | Output |
|---|---|
| `app/reports/monthly.pdf/route.ts` | Monthly report PDF |
| `app/reports/monthly.xlsx/route.ts` | Monthly report Excel |
| `app/reports/yearly.pdf/route.ts` | Yearly report PDF |
| `app/reports/yearly.xlsx/route.ts` | Yearly report Excel |
| `app/reports/monthly-detail/page.tsx` | Detailed monthly view (web) |
| `app/reports/file-upload/page.tsx` | CSV file-upload comparison tool |

---

## Data Assembly

**Source:** `lib/reports/`

| File | Purpose |
|---|---|
| `monthly-data.ts` | Fetches and shapes data for a single month |
| `monthly.ts` | Builds the monthly report structure |
| `year-grid-data.ts` | Builds the 12-month grid for yearly view |
| `exporters.ts` | Shared export helpers for PDF/Excel |

---

## PDF Generation

Uses **pdfmake** (`pdfmake` npm package).  
Type definitions extended in `types/pdfmake.d.ts`.

Reports are streamed as binary response from the API route with `Content-Type: application/pdf`.

---

## Excel Generation

Uses **ExcelJS** for `.xlsx` output.  
Also uses the **xlsx** package for reading uploaded comparison files.

---

## File Upload Comparison Tool

Path: `/reports/file-upload`

Lets staff upload a CSV/Excel file (e.g. bank export) and compare it against the database records to spot discrepancies. Uses **PapaParse** for CSV parsing.

**Source:**
- `app/reports/file-upload/file-upload-form.tsx`
- `app/reports/file-upload/comparison-results.tsx`
- `lib/actions/file-upload.ts`

---

## Money Formatting

All amounts in reports use `formatRM()` from [[Payment System]] (`lib/money.ts`) to render as `RM XX.XX`.
