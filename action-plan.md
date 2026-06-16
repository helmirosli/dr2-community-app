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

Goal: committee can share resident fee reports.

Tasks:

- Add Excel export with ExcelJS.
- Add PDF export with server-side PDF generation.
- Keep public/shareable exports privacy-safe.

Acceptance:

- Admin can download monthly report as `.xlsx` and `.pdf`.

### 7. Add Special Collections

Goal: track extra payments separately from monthly RM50 fees.

Tasks:

- Add special collection create/edit page.
- Assign collections to all active or selected residents.
- Track amount due, amount paid, and status.
- Include special collection status in reports.

Acceptance:

- Extra guarded-service collections do not mix with normal monthly fee coverage.

## Hardening Backlog

- Add CAPTCHA or Turnstile to public submissions.
- Add IP, unit number, and phone rate limiting.
- Add duplicate public submission detection. Status: Done for same-unit overlapping monthly submissions and duplicate proof hashes.
- Add suspicious submission quarantine.
- Add backup/export script for SQLite and uploads.
- Add tests for month range logic, upload validation, approval flow, and reports.