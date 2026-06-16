# DR2 Community Next Action Plan

This action plan continues from `plan.md` and tracks the practical MVP build order for the current Next.js + SQLite app.

## Current Status

- Next.js app foundation is created with TypeScript, Tailwind CSS, Prisma, and SQLite.
- Prisma schema covers residents, payments, monthly coverage, public submissions, uploads, users, audit logs, and special collections.
- Public resident submission form exists at `/submit`.
- Dashboard exists at `/dashboard` with a corporate admin/AJK layout.
- Public submissions can be approved or rejected from the dashboard.
- Approving a public submission creates or updates the resident, creates an official payment, creates monthly coverage records, links uploads, and writes an audit log.
- Receipt/proof upload support is implemented for public submissions and is limited to PDF, JPG, PNG, and WebP.
- Admin/AJK login protection is implemented with first-admin setup, signed HTTP-only session cookies, dashboard guard, logout, and protected approve/reject actions.
- Resident inventory is implemented with protected list, search/filter, add, edit, detail, payment history, and audit logging.
- Official payment recording is implemented with protected entry form, RM50 month-range amount check, duplicate coverage protection, optional proof upload, coverage creation, and audit logging.
- Public duplicate handling now blocks overlapping pending monthly submissions for the same unit, blocks submissions that overlap already-approved official coverage, stores proof file SHA-256 hashes, and rejects duplicate coverage during AJK approval.
- Monthly report view is implemented at `/reports` with month/year selection, optional inactive households, per-resident paid-until, selected-month status (paid/upfront/partial/unpaid), outstanding months and amount, special-collection arrears, last payment date, and a privacy-safe (no phone/bank/proof) shareable layout. Report calculations live in the server-only, testable `lib/reports/monthly.ts` module.
- Excel (`.xlsx`) and PDF report export are implemented as authenticated Node route handlers at `/reports/monthly.xlsx` and `/reports/monthly.pdf`, sharing the same query/calculation as the web view via `lib/reports/monthly-data.ts` and `lib/reports/exporters.ts` (ExcelJS + pdfmake with bundled Roboto fonts). Exports require login (401 otherwise) and stay privacy-safe.
- Year-grid report shows all 12 months for all residents at `/reports` (new primary report view) and public `/status` page, with proper status labels (FOR SALE, MOVED OUT, EXEMPT) for non-paying units. Monthly detail (old view) accessible at `/reports/monthly-detail`. Reports now show special collection status in a dedicated column when active.
- Resident status expanded from 3 to 4 values: ACTIVE (paying RM50), EXEMPT (exempt from monthly fee but may pay utilities), FOR_SALE (vacant unit), MOVED_OUT (pending new resident). Updated all forms, lists, and reports; database records migrated via Prisma migration.
- Special collections management fully built: `/special-collections` list, `/special-collections/new` create form, `/special-collections/[id]/edit` edit form, `/special-collections/[id]` detail view. Admin/AJK can create collections, assign to all-active or select-specific residents, track amount due/paid, and view collection status. Collections appear in year-grid reports and resident status records.

## Immediate Next Action

### 1. Finish Public Proof Upload Validation

Status: Done.

Goal: make the public resident form accept one payment proof file safely.

Tasks:

- Confirm `UPLOAD_DIR` and upload size environment defaults.
- Validate file presence for non-cash payments.
- Validate extension, MIME type, file signature, and file size on the server.
- Store uploads outside the source/build folders.
- Save upload metadata in SQLite through the `Upload` model.
- Attach the upload to `PublicPaymentSubmission` until approval.
- Move/link the upload to the official `Payment` when approved.
- Confirm `next.config.ts` allows the configured upload size for Server Actions.

Acceptance:

- Cash submissions can be submitted without a proof file.
- Bank transfer, DuitNow, e-wallet, cheque, and other non-cash submissions require a proof file.
- Invalid files are rejected with a clear message.
- Valid uploads are stored under the configured upload directory and recorded in SQLite.
- `npm run lint` and `npm run build` pass.

## Next MVP Actions After Uploads

### 2. Add Admin/AJK Login Protection

Status: Done.

Goal: dashboard actions must not be public.

Tasks:

- Add simple secure session login for admin/AJK.
- Seed or create the first admin user.
- Protect `/dashboard` and all official write actions.
- Allow only admin/AJK to approve or reject submissions.
- Add logout.

Acceptance:

- Residents can still access `/submit` without login.
- `/dashboard` requires login.
- Approve/reject actions fail when not authenticated.

### 3. Build Resident Inventory

Status: Done.

Goal: admin can manage resident household records.

Tasks:

- Add residents list page.
- Add create/edit resident form.
- Add search by unit number, name, phone, and status.
- Add resident detail page with payments and coverage.

Acceptance:

- Admin/AJK can add and update resident records.
- Dashboard active resident count reflects the inventory.

### 4. Build Official Payment Recording

Status: Done.

Goal: admin/AJK can record payments directly without public submission.

Tasks:

- Add payment form for selected resident.
- Support monthly fee and special collection payment types.
- Support start/end month coverage.
- Auto-calculate expected RM50 monthly amount.
- Add duplicate coverage checks.
- Support admin/AJK proof upload.

Acceptance:

- A one-month payment creates one coverage row.
- A backdated or upfront payment creates multiple coverage rows.
- Duplicate full monthly coverage is blocked or requires confirmation.

### 5. Build Monthly Report View

Status: Done.

Goal: admin can see who is paid, unpaid, partial, or paid upfront.

Tasks:

- Add monthly report page.
- Calculate paid-until month per resident.
- Show selected month payment status.
- Show outstanding month count and amount.
- Hide sensitive data from shareable report view.

Acceptance:

- Report shows every active resident.
- Report makes arrears and paid-until status clear.

### 6. Add Excel and PDF Export

Status: Done.

Goal: committee can share resident fee reports.

Tasks:

- Add Excel export with ExcelJS.
- Add PDF export with server-side PDF generation.
- Keep public/shareable exports privacy-safe.

Acceptance:

- Admin can download monthly report as `.xlsx` and `.pdf`.

### 7. Add Special Collections

Status: Done.

Goal: track extra payments separately from monthly RM50 fees.

Tasks:

- Add special collection create/edit page.
- Assign collections to all active or selected residents.
- Track amount due, amount paid, and status.
- Include special collection status in reports.

Acceptance:

- Extra guarded-service collections do not mix with normal monthly fee coverage.

## Hardening Backlog

- Add CAPTCHA or Turnstile to public submissions. Status: Done.
- Add IP, unit number, and phone rate limiting.
- Add duplicate public submission detection. Status: Done for same-unit overlapping monthly submissions and duplicate proof hashes.
- Add suspicious submission quarantine.
- Add backup/export script for SQLite and uploads.
- Add tests for month range logic, upload validation, approval flow, and reports.

## Design & Layout Overhaul

### 8. Complete Design Redesign with Persistent Navigation

Status: Done.

Goal: unified design system with persistent sidebar on all admin pages and redesigned public pages.

Tasks:

- Create persistent sidebar layout component that appears on all admin pages (dashboard, residents, payments, reports, collections).
- Design unified color scheme and component styling using Tailwind CSS.
- Redesign admin dashboard with improved metrics cards, submission queue, and collection health indicators.
- Redesign public `/submit` page with better form organization, info cards, and help sections.
- Redesign public `/status` page with improved table styling, year selector, and legend.
- Implement mobile-responsive design for all pages (sidebar collapses on mobile, touch-friendly interactions).
- Create public layout wrapper with header and footer for public-only routes.

Completed:

- app/layout-wrapper.tsx: Server component providing persistent sidebar with navigation, user info, and logout.
- app/(public)/layout.tsx: Public route group layout with header, navigation, and footer.
- Updated app/dashboard/page.tsx to work with new layout (removed duplicate sidebar).
- Redesigned app/(public)/submit/page.tsx with better UX, info cards, and form sections.
- Redesigned app/(public)/status/page.tsx with improved table styling and legend.
- All pages now mobile-responsive with proper Tailwind breakpoints.

Acceptance:

- Sidebar appears on all authenticated admin pages (dashboard, residents, payments, reports, collections).
- Public pages have a clean header/footer layout separate from admin sidebar.
- Dashboard shows metrics cards (collection, residents, pending, collections) with better visual hierarchy.
- Submit form has clear sections: Resident Info, Payment Info, Coverage Period, Additional Info, Proof, Verification.
- Status page has improved table readability with better color coding and legend.
- Mobile view works smoothly with responsive design (sidebar visible on desktop, navigation in header on mobile).
- No breaking changes to existing functionality.