# DR2 Community Inventory and Resident Fee Project Plan

## 1. Project Summary

Build a web application for managing resident records, monthly resident fee payments, receipt uploads, flexible payment periods, special extra collections, and monthly shareable reports.

The base resident fee is RM50 per month. The collected money is used for guarded service, guard bills, and maintenance. The system must support normal monthly payment, backdated payment, upfront payment, and extra one-time payments such as additional 24-hour guard service during Raya or other long festival periods.

## 2. Recommended Technology Decision

Use a full-stack Next.js application with SQLite. This keeps the project in one codebase while still providing server-side protection for dashboard actions, public resident submissions, uploads, reports, and database access.

Recommended stack:

- Framework: Latest stable Next.js using the App Router.
- Language: TypeScript.
- UI: React components with Tailwind CSS and shadcn/ui or another consistent component set.
- Server logic: Next.js Server Actions and Route Handlers.
- Database: SQLite with Prisma ORM for schema, migrations, and type-safe queries.
- Authentication: Auth.js, Lucia, or a simple secure session implementation for admin/AJK login.
- File uploads: Store PDF/image files on disk for MVP, with metadata in SQLite. Move to S3-compatible storage later if needed.
- Reports: Generate Excel with ExcelJS and PDF with a server-side PDF library from Next.js server code.
- Deployment: Node.js runtime hosting with persistent storage, such as a VPS, Railway persistent volume, Fly.io volume, Render disk, or another host that supports SQLite and uploads.

Next.js is suitable because this project is both a dashboard and a form system. The public resident form can be rendered by Next.js, while the actual submission handling, validation, anti-spam checks, file upload checks, and database writes happen on the server.

Do not use Markdown as the main data store. Markdown can be used for documentation or exported summaries, but payment records need reliable filtering, monthly coverage checks, upload metadata, reporting, and audit history.

Future scale option:

- Keep Next.js.
- Move SQLite to PostgreSQL if concurrent usage, hosting, or backup needs grow.
- Move uploaded files to S3-compatible object storage.
- Add Redis or a managed rate limit service if the app is deployed across multiple instances.

## 3. Main Users

- Admin: Full access to manage residents, approve/reject submissions, record payments, upload proof, create reports, configure fees, and manage users.
- AJK or committee member: Dashboard access for assigned duties such as reviewing resident submissions, recording payments, and generating reports. Permissions can be limited by role.
- Resident: No login required. Can fill a public payment/proof submission form. Submissions stay pending until admin or AJK reviews them.
- Auditor or committee reviewer: Reviews payment history, generated reports, and receipt attachments.

## 4. Core Features

### 4.1 Resident Inventory

Track all resident or household records:

- House number or unit number
- Resident name
- Phone number or contact
- Email, optional
- Street, block, or phase
- Status: active, inactive, moved out
- Notes
- Created and updated timestamps

The system should treat the household or unit as the main payment account, because payment is usually tied to a house rather than only a person.

### 4.2 Monthly Fee Configuration

Default monthly fee:

- Fee name: Resident Fee
- Amount: RM50
- Billing frequency: Monthly
- Purpose: Guarded service, guard bill, and maintenance

The monthly fee amount should be configurable for future changes. Store effective dates so old payments remain historically accurate if the fee changes later.

### 4.3 Payment Recording Form

The logged-in admin/AJK payment form must support these scenarios:

1. Current month payment, for example June only.
2. Backdated payment, for example January to May.
3. Upfront payment, for example January to December.
4. Mixed payment, for example current month plus arrears.
5. Extra payment, for example festival 24-hour guard collection.

Payment form fields:

- Resident or household
- Payment type: monthly fee or extra charge
- Payment method: cash, bank transfer, e-wallet, cheque, other
- Amount paid
- Coverage start month
- Coverage end month
- Payment date
- Reference number, optional
- Receipt/proof upload, optional but recommended
- Notes

Validation rules:

- Coverage end month cannot be before coverage start month.
- Monthly fee amount should match covered months multiplied by configured fee, unless admin enters an approved adjustment.
- Duplicate full payment for the same household and same month should require confirmation or be blocked.
- File uploads only allow PDF and image formats.
- Uploaded file size should have a configurable limit, recommended default 5 MB or 10 MB.

### 4.4 Public Resident Submission Form

Residents can submit payment details without login using a public form. This form is for collecting proof and payment information only. It must not directly mark a resident as paid.

Public form fields:

- House or unit number
- Resident name
- Phone number
- Payment type: monthly fee or extra charge
- Coverage start month
- Coverage end month
- Amount paid
- Payment date
- Payment method
- Reference number, optional
- Receipt/proof upload, required when payment is not cash
- Notes, optional

Public submission rules:

- Save public submissions as `pending_review`.
- Admin or AJK must approve the submission before it creates an official payment record.
- Admin or AJK can reject the submission with a reason.
- Public submissions should be matched to an existing resident/unit during review.
- If the unit number is unknown, keep the submission pending and flag it for manual checking.

Recommended public form security:

- Use CAPTCHA or Turnstile.
- Use a honeypot hidden field.
- Rate limit by IP address, unit number, and phone number.
- Require a valid unit number or optional resident invitation code where possible.
- Detect duplicate submissions with the same unit, amount, date, month range, and reference number.
- Limit uploads to PDF and images.
- Show a neutral success message without revealing private resident data.

### 4.5 Payment Coverage Logic

For monthly fees, the system should create covered month records from the selected start and end month.

Example backdated payment:

- Resident pays RM250 for January to May.
- System records one payment transaction.
- System marks January, February, March, April, and May as covered for that household.

Example upfront payment:

- Resident pays RM600 for January to December.
- System records one payment transaction.
- System marks all 12 months as covered.

The UI should always show paid-until for every resident based on continuous monthly fee coverage.

### 4.6 Extra Payment / Special Collection

Some years may require extra payments for special reasons, such as 24-hour guarded service during Raya or other long festival periods.

Special collection fields:

- Title
- Description
- Amount per household
- Due date
- Applicable households: all active residents or selected households
- Collection period or event date
- Status: draft, active, closed

The report should show special collection status separately from the normal RM50 monthly resident fee.

### 4.7 Receipt and Proof Uploads

Allowed file types:

- PDF: `application/pdf`
- Images: `image/jpeg`, `image/png`, `image/webp`

Recommended upload rules:

- Validate file extension and MIME type.
- Store files outside the Next.js source and build directories.
- Rename stored files using generated IDs to avoid collisions.
- Keep original filename in database metadata.
- Associate admin/AJK uploads with a payment transaction.
- Associate resident public uploads with a pending submission until reviewed.
- Restrict viewing and downloading uploaded files to authenticated admin/AJK users.

### 4.8 Form Security and Anti-Spam Measures

Admin and AJK users are the only logged-in users. Residents do not log in, but they can fill a public submission form. Because the resident form is public, all resident submissions must be treated as untrusted until reviewed.

Security rules for dashboard forms:

- Require authenticated admin/AJK login before any create, update, delete, upload, or export action.
- Use role-based permissions, starting with `admin`, `ajk`, and `viewer` roles.
- Validate every form on the server with a schema validator such as Zod, not only browser validation.
- Reject unknown fields so spam payloads cannot quietly store extra data.
- Add CSRF protection if using cookie-based sessions.
- Use secure, HTTP-only cookies for sessions if possible.
- Add request rate limiting for login, upload, and form submit endpoints.
- Lock or slow down repeated failed login attempts.
- Keep an audit log for payment edits, deletes, and suspicious repeated attempts.

Security rules for public resident forms:

- Keep public submissions separate from approved payments.
- Store public submissions as `pending_review` until admin or AJK approves them.
- Do not let public submissions directly mark a month as paid.
- Require a valid unit number or invitation code where practical.
- Add CAPTCHA or Turnstile on public forms.
- Add a honeypot hidden field and reject submissions where it is filled.
- Rate limit by IP address, resident/unit code, phone number, and device fingerprint where practical.
- Add duplicate detection for same resident, amount, month range, and reference number.
- Block or quarantine submissions with unsafe files, too many retries, or impossible payment periods.

File upload security:

- Allow only PDF, JPG/JPEG, PNG, and WebP.
- Validate extension, MIME type, and file signature where practical.
- Enforce file size limits.
- Generate safe stored filenames.
- Store uploads outside the frontend app folder.
- Do not execute or parse uploaded files as code.
- Optionally add malware scanning before production public uploads.

### 4.9 Reports

Admin can generate monthly reports for viewing, PDF export, and Excel export.

Report goals:

- Help residents double-check whether they already paid.
- Show until which month each household is covered.
- Show unpaid months or outstanding amount.
- Show extra collection status when active.
- Provide a shareable version suitable for committee or resident review.

Monthly report columns:

- House or unit number
- Resident name
- Current status
- Paid until
- Selected month status: paid, unpaid, partial, overpaid, not applicable
- Outstanding months
- Outstanding amount
- Extra collection due amount, if any
- Last payment date
- Notes, optional

Privacy recommendation:

- Public or shareable reports should avoid showing private phone numbers, full receipt references, bank details, or uploaded proof files.
- Admin/AJK-only reports can include more detailed payment references.

## 5. Suggested Data Model

### Resident

- id
- unitNumber
- name
- phone
- email
- streetOrBlock
- status
- notes
- createdAt
- updatedAt

### FeePlan

- id
- name
- amount
- frequency
- effectiveFrom
- effectiveTo
- isActive

### Payment

- id
- residentId
- paymentType
- amount
- paymentDate
- method
- referenceNo
- notes
- createdBy
- createdAt
- updatedAt

### PaymentCoverage

- id
- paymentId
- residentId
- year
- month
- feePlanId
- amountApplied
- status

This table makes reporting easier because one payment can cover many months.

### SpecialCollection

- id
- title
- description
- amountPerResident
- dueDate
- eventStartDate
- eventEndDate
- status
- createdAt
- updatedAt

### SpecialCollectionAssignment

- id
- specialCollectionId
- residentId
- amountDue
- amountPaid
- status

### Upload

- id
- paymentId
- originalFilename
- storedFilename
- mimeType
- sizeBytes
- storagePath
- uploadedAt

### PublicPaymentSubmission

- id
- unitNumber
- residentName
- phone
- paymentType
- amount
- paymentDate
- method
- coverageStartYear
- coverageStartMonth
- coverageEndYear
- coverageEndMonth
- referenceNo
- notes
- status
- reviewReason
- reviewedBy
- reviewedAt
- createdAt

Public submissions are not official payments. Approval creates or links an official payment and monthly coverage records.

### User

- id
- name
- email
- passwordHash
- role
- createdAt
- updatedAt

## 6. Key Screens

### Dashboard

- Total active residents
- Amount collected this month
- Outstanding amount this month
- Residents paid until current month
- Residents with arrears
- Active special collections

### Residents

- Resident list
- Search and filter by unit, name, status, paid/unpaid
- Add/edit resident
- Resident detail with payment history and uploads

### Record Payment

- Select resident
- Choose monthly fee or extra collection
- Select coverage start and end month
- Auto-calculate expected amount
- Upload receipt/proof
- Save payment

### Public Resident Form

- Resident enters unit and payment details
- Resident uploads proof file
- System runs anti-spam checks
- Submission is saved as pending review
- Admin/AJK approves or rejects from dashboard

### Reports

- Select report month/year
- Include/exclude inactive residents
- Include/exclude special collections
- View report in browser
- Export PDF
- Export Excel

### Settings

- Monthly fee amount and effective date
- Upload file size limit
- Admin users
- Payment methods

## 7. API Plan

Suggested Next.js Route Handlers or Server Actions:

- `POST /auth/login`
- `GET /residents`
- `POST /residents`
- `GET /residents/:id`
- `PATCH /residents/:id`
- `GET /fees`
- `POST /fees`
- `POST /payments`
- `GET /payments`
- `POST /public/payment-submissions`
- `GET /payment-submissions`
- `PATCH /payment-submissions/:id/approve`
- `PATCH /payment-submissions/:id/reject`
- `GET /payments/:id/uploads/:uploadId`
- `POST /special-collections`
- `GET /special-collections`
- `PATCH /special-collections/:id`
- `GET /reports/monthly?year=2026&month=6`
- `GET /reports/monthly.pdf?year=2026&month=6`
- `GET /reports/monthly.xlsx?year=2026&month=6`

## 8. Implementation Phases

### Phase 1: Project Foundation

- Create Next.js app with TypeScript.
- Add Tailwind CSS and shadcn/ui or chosen UI components.
- Add SQLite and Prisma.
- Add authentication skeleton, server validation, and rate limiting.
- Add admin/AJK roles.
- Add base layout and routing.

### Phase 2: Resident Inventory

- Build resident CRUD.
- Add search and filters.
- Add resident detail page.

### Phase 3: Monthly Payment Recording

- Add fee configuration.
- Build payment form.
- Implement month range coverage logic.
- Add duplicate coverage validation.
- Add receipt upload validation.
- Require admin/AJK authentication for official payment writes.

### Phase 4: Public Resident Submission Form

- Build public no-login resident payment form.
- Add CAPTCHA or Turnstile.
- Add honeypot and rate limiting.
- Save submissions as pending review.
- Add dashboard queue for admin/AJK approval or rejection.

### Phase 5: Reports

- Build monthly report query.
- Add paid/unpaid/paid-until calculation.
- Add PDF export.
- Add Excel export.

### Phase 6: Special Collections

- Create special collection management.
- Assign special charges to residents.
- Record payment against special collections.
- Include status in reports.

### Phase 7: Polish and Hardening

- Add audit log for payment changes.
- Add backup/export command for SQLite database and uploads.
- Add role-based access.
- Add CSRF protection if using cookie sessions.
- Add login throttling and suspicious activity logs.
- Add tests for payment coverage and reports.
- Improve responsive UI for mobile admin use.

## 9. Important Business Rules

- A resident can pay one month, many backdated months, or future months in a single transaction.
- A payment transaction can have one uploaded proof file or multiple files if needed.
- Monthly fee coverage should be calculated by month, not by free text notes.
- Special payments should not be mixed with normal monthly fee coverage.
- Reports must make it easy to see who paid, who has arrears, and who paid upfront.
- Generated public reports should avoid exposing sensitive personal or banking information.
- Public resident submissions are never official payment records until approved by admin or AJK.

## 10. Testing Plan

Prioritize tests for:

- Month range calculation across years.
- RM50 monthly amount calculation.
- Backdated payment from January to May.
- Upfront payment for one year.
- Duplicate payment prevention.
- Special collection payment status.
- PDF and Excel report export.
- File upload type and size validation.
- Rate limiting on login, upload, and form submission endpoints.
- Public resident form anti-spam controls.
- Public resident submission approval and rejection flow.

## 11. Definition of Done for MVP

- Admin can add residents.
- Admin can record monthly payments for one month or a range of months.
- Admin can upload PDF/image proof for a payment.
- Admin can see each resident's paid-until month.
- Admin can generate a monthly report in web view.
- Admin can export the report to PDF and Excel.
- Admin can create and track at least one extra special collection.
- SQLite database stores all residents, payments, coverage, special charges, and upload metadata.
