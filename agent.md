# Project Agent Guide

Use this file as guidance for coding agents working on the DR2 Community Resident Fee System.

## Product Context

This project manages resident inventory, monthly resident fee payments, uploaded payment proof, extra special collections, and reports for a community guarded and maintenance fund.

The base monthly resident fee is RM50. Residents may pay:

- Current month only.
- Backdated months, such as January to May.
- Upfront months, such as a full year.
- Extra special collections, such as temporary 24-hour guarded service during festival periods.

Admin and AJK users are the only logged-in users. Residents do not log in; they submit payment details through a public form, and those submissions require admin/AJK review before they become official payments.

## Technical Direction

- Use the latest stable Next.js release with the App Router.
- Use TypeScript throughout the app.
- Use React components with Tailwind CSS and shadcn/ui or another consistent UI component set.
- Use Next.js Server Actions and Route Handlers for server-side logic.
- Use SQLite with Prisma as the source of truth.
- Do not use Markdown files as the main database.
- Keep uploaded receipt files on disk for MVP and store metadata in SQLite.
- Generate reports from database records, not from manually maintained spreadsheets.
- If the app grows beyond SQLite, migrate to PostgreSQL while keeping the Next.js architecture.

## Domain Rules

- Treat each house or unit as the payment account.
- Store one payment transaction separately from the months it covers.
- Use a `PaymentCoverage` style table or equivalent model so one payment can cover multiple months.
- Calculate paid-until from continuous monthly coverage.
- Keep special collection payments separate from normal monthly resident fees.
- Avoid duplicate paid coverage for the same resident, year, and month unless there is an intentional adjustment flow.
- Public or shareable reports must not expose sensitive personal or banking details.

## Next.js Server Boundary

Keep private logic on the server. Do not expose database paths, session secrets, upload paths, payment approval logic, or private report data in client components.

Client components may handle interaction and display, but official payment creation, resident submission review, file validation, report export, authentication checks, and database writes must happen in Server Actions, Route Handlers, or server-only modules.

## Forms

Payment forms must support:

- Resident selection.
- Payment type selection.
- Payment method.
- Amount paid.
- Coverage start month and coverage end month.
- Payment date.
- Optional reference number.
- Optional receipt/proof upload.
- Notes.

Validation expectations:

- End month must be the same as or later than start month.
- Expected amount should be calculated from covered months and fee amount.
- Admin should see a warning before saving an unusual amount.
- PDF and image uploads only.
- File size limit should be configurable.
- All form submissions must be validated on the server as well as the client.
- Use Zod or an equivalent schema validator and reject unknown fields.

## Security And Anti-Spam

- Dashboard write access should be limited to admin and AJK users.
- Residents should not have login accounts in the MVP.
- Public resident form submissions must be saved as `pending_review`.
- Public resident submissions must not directly create official payments or mark months as paid.
- Require authentication before creating residents, approving payments, creating official payments, uploading dashboard files, creating special collections, or exporting reports.
- Add role-based access with at least `admin`, `ajk`, and `viewer` roles.
- Add rate limiting for login, upload, payment creation, resident creation, and public form endpoints.
- Add lockout or delay after repeated failed login attempts.
- Use CSRF protection if cookie-based sessions are used.
- Use secure HTTP-only cookies for session tokens when practical.
- Keep audit logs for payment edits, deletes, and suspicious repeated submissions.

Public resident forms must include anti-spam controls:

- Unique resident/unit code or invitation link.
- CAPTCHA or Turnstile.
- Honeypot hidden field.
- Rate limit by IP address and resident/unit code.
- Duplicate detection for resident, amount, month range, and reference number.
- Admin/AJK approval or rejection workflow.

## Upload Handling

Allowed upload MIME types:

- `application/pdf`
- `image/jpeg`
- `image/png`
- `image/webp`

Implementation rules:

- Validate MIME type and extension.
- Generate safe stored filenames.
- Keep original filename in metadata.
- Do not place uploaded files inside the Next.js app source or build output.
- Restrict download/view access to authenticated users.

## Reporting

Monthly reports should support web view, PDF export, and Excel export.

Reports should make these questions easy to answer:

- Has this resident paid for the selected month?
- Until which month has this resident paid?
- Which residents have arrears?
- Which residents paid upfront?
- Is there any active special collection still unpaid?

Preferred report fields:

- Unit number
- Resident name
- Paid until
- Selected month payment status
- Outstanding months
- Outstanding amount
- Extra collection status
- Last payment date

## UI Guidance

- Build the actual admin tool, not a marketing landing page.
- Prioritize clear tables, filters, forms, and report actions.
- Keep dashboard information compact and useful.
- Use stable layouts for tables and forms so values do not jump around.
- Use accessible labels, validation messages, and keyboard-friendly form controls.

## Testing Priorities

Prioritize tests for payment logic before visual polish:

- Month range expansion.
- Backdated payments.
- Upfront payments.
- Duplicate month coverage.
- Paid-until calculation.
- Special collection status.
- Upload validation.
- PDF and Excel report generation.

## Implementation Style

- Keep changes small and focused.
- Prefer clear domain names over abbreviations.
- Put business calculations in server-only modules that can be unit tested.
- Avoid hiding payment rules inside UI components only.
- Add migrations for schema changes.
- Do not commit uploaded files, SQLite database files, or generated reports to git.

## VS Code Agent Note

This file is a plain project guide because the requested filename is `agent.md`. If this project later needs a real VS Code custom agent, create `.github/agents/dr2-community.agent.md` with YAML frontmatter and copy the relevant guidance from this file.
