# DR2 Community App — Architecture Overview

A **community management system** for a Malaysian residential neighborhood (Desarestu), built with Next.js 16 (App Router) + Prisma + PostgreSQL (Neon serverless). The app handles resident registration, monthly fee collection, special levies, public payment submissions, and financial reporting.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16.2 (App Router, React 19) |
| Language | TypeScript 5 |
| Database | PostgreSQL via [Neon](https://neon.tech) serverless |
| ORM | Prisma 7 (output → `generated/prisma/`) |
| Styling | Tailwind CSS v4 |
| File Storage | Google Cloud Storage |
| PDF export | pdfmake |
| Excel export | ExcelJS / xlsx |
| Spam protection | Cloudflare Turnstile |
| Runtime | Node.js ≥ 22.5 |

---

## Top-Level Concepts

- [[Authentication & Authorization]] — custom HMAC session tokens, role-based access
- [[Data Model]] — all Prisma models and their relationships
- [[Resident Management]] — units, tenants, vehicles
- [[Payment System]] — monthly fees, coverage allocation, fee plans
- [[Public Submission Flow]] — unauthenticated payment submissions with review queue
- [[Special Collections]] — one-off levies assigned to residents
- [[Reports & Exports]] — monthly/yearly PDF and Excel exports
- [[File Uploads]] — GCS-backed receipts attached to payments and submissions
- [[i18n]] — English / Bahasa Malaysia runtime switching
- [[Audit Log]] — append-only mutation history across all entities

---

## Services

### Auth & Users
- [[Service - Auth]] — session cookie creation, parsing, and auth guard functions
- [[Service - Auth Actions]] — login / logout server actions
- [[Service - User Management]] — ADMIN-only user CRUD and password change

### Residents
- [[Service - Resident Actions]] — create and update residents (with audit log)

### Payments
- [[Service - Payment Actions]] — staff payment recording, resident snapshot, coverage building
- [[Service - Coverage Allocation]] — distributes an amount across months with carry-forward
- [[Service - Duplicate Detection]] — prevents double-payment submissions and coverage conflicts

### Public Submissions
- [[Service - Public Submissions]] — unauthenticated submit form action with CAPTCHA + dedup
- [[Service - Review Submissions]] — approve/reject submissions, converts them to real payments
- [[Service - Turnstile]] — Cloudflare CAPTCHA server-side verification

### Special Collections
- [[Service - Special Collection Actions]] — create/update levies and manage resident assignments

### Files
- [[Service - GCS Upload]] — upload, validate, hash, and delete files in Google Cloud Storage
- [[Service - Upload Proxy API]] — authenticated proxy route for downloading GCS files

### Reports
- [[Service - Reports]] — monthly/yearly data assembly and PDF/Excel export helpers

### Infrastructure
- [[Service - Prisma Client]] — singleton Prisma client with dual Neon/pg adapter setup
- [[Service - Search API]] — `/api/search/global` and `/api/search/residents` routes
- [[Service - Validation]] — shared Zod schemas (`publicSubmissionSchema`)

---

## App Structure

```
app/
  (public)/          ← unauthenticated pages (submit, status)
  dashboard/         ← main landing page with KPIs
  residents/         ← CRUD for residents, tenants, vehicles
  payments/          ← payment recording + submission review queue
  special-collections/ ← levy management
  reports/           ← monthly/yearly reports + file-upload comparison
  settings/          ← user management (ADMIN only)
  setup/             ← first-run wizard
  login/
  api/
    search/          ← global + resident search endpoints
    uploads/[...path]/ ← proxied file download from GCS

lib/
  actions/           ← Next.js Server Actions (one file per domain)
  auth.ts            ← session management
  prisma.ts          ← singleton Prisma client
  payments/          ← coverage calculation logic
  reports/           ← report data assembly
  i18n/              ← locale dictionaries
  uploads.ts         ← GCS helpers
  money.ts           ← RM formatting, default fee constant
  validation.ts      ← shared Zod schemas
```

---

## Request Flow

```
Browser
  │
  ├─ Public pages (/submit, /status)
  │    └─ [[Public Submission Flow]]
  │
  └─ Admin pages (all others)
       └─ requireDashboardUser() → [[Authentication & Authorization]]
            └─ Server Component fetches via Prisma → [[Data Model]]
                 └─ Server Action mutations → lib/actions/*
```

---

## Key Design Decisions

- **No external auth library** — custom HMAC-SHA256 signed session cookie (`dr2_session`), 8-hour TTL. See [[Authentication & Authorization]].
- **Server Actions over REST** — all mutations use `"use server"` actions, keeping business logic server-side.
- **Amounts in sen** — all monetary values stored as integers (sen = 1/100 RM) to avoid floating-point errors. See [[Payment System]].
- **Coverage carry-forward** — if a resident overpays, coverage auto-extends up to 24 months forward. See [[Payment System]].
- **Dual adapters** — Prisma is configured with both `@prisma/adapter-neon` (serverless) and `@prisma/adapter-pg` (local dev). See [[Data Model]].
