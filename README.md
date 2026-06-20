# DR2 Community Resident Fee System

Planning repository for a resident inventory, payment recording, receipt upload, and reporting system for DR2 community fees.

The monthly resident fee is RM50. It is used for guarded service, guard bills, and maintenance. The system is designed to handle normal monthly payments, backdated payments, upfront payments, and extra special collections such as temporary 24-hour guarded service during long festival periods.

## Project Goals

- Keep a clean resident inventory by house or unit.
- Record resident fee payments with flexible month coverage.
- Support payment examples like January to May, current month only, or one year upfront.
- Upload receipt/proof files limited to PDF or images.
- Show each resident's payment status and paid-until month.
- Generate monthly reports for view, PDF export, and Excel export.
- Track extra payments separately from the normal RM50 monthly fee.
- Allow residents to submit payment details through a public no-login form for admin/AJK review.

## Recommended Stack

The project will use a full-stack Next.js app with SQLite:

- Next.js latest stable release with App Router.
- TypeScript.
- React components with Tailwind CSS and shadcn/ui or another consistent UI component set.
- Next.js Server Actions and Route Handlers for server-side logic.
- SQLite as the first production database.
- Prisma ORM for schema, migrations, and type-safe database access.
- Auth.js, Lucia, or secure custom sessions for admin/AJK login.
- Google Cloud Storage for PDF/image proof uploads, with metadata stored in SQLite.
- Excel export using ExcelJS.
- PDF export using a server-side PDF library.

This is a good fit because the app needs both dashboard UI and secure server-side logic. Residents can access a public no-login form, while validation, anti-spam checks, file upload checks, approval logic, and database writes stay on the Next.js server.

SQLite is suitable for the first version because this is a community-sized system with structured payment records and reports. If the app later needs more concurrent usage or easier cloud scaling, migrate SQLite to PostgreSQL for scaling.

## Planned Repository Structure

```text
dr2-community/
  app/                   # Next.js App Router pages and route handlers
  components/            # Reusable UI components
  lib/                   # Auth, Prisma, validation, reports, upload helpers
  prisma/
    schema.prisma        # SQLite data model
    migrations/
  # uploads/ directory removed — files now stored in Google Cloud Storage
  docs/
  plan.md
  readme.md
  agent.md
```

## Main Workflows

### Record Current Month Payment

Admin selects a resident, chooses the current month, enters RM50, uploads proof if available, and saves the payment.

### Record Backdated Payment

Admin selects a resident, chooses a start month and end month, for example January to May, and the system calculates the expected total as 5 months x RM50 = RM250.

### Record Upfront Payment

Admin selects a resident, chooses a full year range, for example January to December, and the system calculates RM600.

### Record Extra Payment

Admin creates a special collection, such as Raya 24-hour guarded service, assigns it to residents, and records payment separately from monthly resident fees.

### Public Resident Payment Form

Residents do not need an account. They can open a public form, enter their unit and payment details, upload proof, and submit. The submission does not automatically mark the resident as paid. Admin or AJK must review and approve it first.

## Report Output

Monthly reports should show:

- House or unit number
- Resident name
- Paid until
- Current month status
- Outstanding months
- Outstanding amount
- Extra collection status, if active
- Last payment date

Reports should be available as:

- Web view
- PDF file
- Excel file

Public or shareable reports should avoid exposing private phone numbers, banking details, receipt files, and sensitive references.

## Upload Rules

Allowed upload formats:

- PDF
- JPG/JPEG
- PNG
- WEBP

Recommended default upload limit: 5 MB or 10 MB per file.

The Next.js server should validate both file extension and MIME type. Uploaded files should be stored outside the app source/build folders, with only metadata stored in SQLite.

## Form Security And Anti-Spam

Admin and AJK are the only users with dashboard login. Residents do not log in, but they can submit payment details through a public form. Public submissions must be treated as untrusted until reviewed.

Security measures for the dashboard:

- Require admin/AJK login before creating residents, approving payments, uploading admin files, creating special charges, or exporting reports.
- Validate every form on the server, not only in the browser.
- Add role-based access, starting with admin, AJK, and viewer roles.
- Add rate limiting for login, upload, and form submission endpoints.
- Add account lockout or delay after repeated failed login attempts.
- Add audit logs for payment edits, deletes, and suspicious repeated submissions.
- Use CSRF protection if the app uses cookie-based sessions.

Security measures for the public resident form:

- Save all resident submissions as `pending_review`.
- Do not let public submissions directly mark months as paid.
- Require unit number, resident name, phone number, amount, payment date, payment period, and proof upload when applicable.
- Use a unique resident/unit code or invitation link where possible.
- CAPTCHA or Turnstile.
- Honeypot hidden field.
- Rate limit by IP address and resident/unit code.
- Duplicate detection for same resident, amount, month range, and reference number.
- Admin/AJK approval or rejection from the dashboard.

Public form endpoints must only create pending submissions. They must not expose private resident, payment, report, or upload data to anonymous users.

## Future Setup Commands

These commands are a proposed starting point once implementation begins:

```bash
npx create-next-app@latest dr2-community --typescript --tailwind --eslint --app
cd dr2-community
npm install prisma @prisma/client zod exceljs
npm install next-auth
npm install pdfmake
npx prisma init --datasource-provider sqlite
```

If using shadcn/ui:

```bash
npx shadcn@latest init
```

If using Auth.js, configure the authentication provider and session strategy before building dashboard pages.

Initial Prisma migration after creating the schema:

```bash
npx prisma migrate dev --name init
```

Exact commands may change depending on the selected auth library, UI library, and PDF library.

## MVP Checklist

- Resident CRUD
- Monthly fee configuration
- Flexible payment form
- Public no-login resident submission form
- Admin/AJK submission review queue
- Month range payment coverage
- Receipt upload validation
- Admin login and backend form validation
- Rate limiting for login, uploads, and submissions
- Paid-until calculation
- Monthly report web view
- PDF export
- Excel export
- Special collection tracking
- SQLite backup guidance

## Documentation

- See `plan.md` for the detailed product and technical plan.
- See `agent.md` for project-specific guidance for future coding agents.

## Database

- **Local Postgres:** For local development, set `DATABASE_URL` to a Postgres connection string in `.env` (see `.env.example`). Example:

  `DATABASE_URL="postgresql://postgres:postgres@localhost:5432/dr2_community"`

- **Prisma migrations:** If you move from SQLite to Postgres, update `prisma/schema.prisma` datasource `provider` to `"postgresql"`, then run:

```bash
npx prisma migrate dev --name init
```

- **Vercel / Production:** On Vercel, set the `DATABASE_URL` environment variable to your managed Postgres provider (Supabase, Neon, AWS RDS, etc.). Do not use a file-based `file:` URL in production — serverless platforms are often read-only and ephemeral.

- **Alternate KK_* envs:** The app also supports building the `DATABASE_URL` from individual environment variables named `KK_HOST`, `KK_PORT`, `KK_USERNAME`, `KK_PASSWORD`, `KK_DATABASE`, and `KK_SSL`. If `DATABASE_URL` is not set, these will be used to construct the connection string. You can also set `SCHEME` (defaults to `postgresql`) to control the URL scheme.

