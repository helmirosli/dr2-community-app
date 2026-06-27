# Data Model

Part of [[Architecture Overview]]. All models live in the `desarestu_db` PostgreSQL schema.

**Prisma schema:** `prisma/schema.prisma`  
**Generated client:** `generated/prisma/`

---

## Entity Relationship Summary

```
User
  └─ Payment (createdBy)
  └─ PublicPaymentSubmission (reviewedBy)

Resident
  ├─ Payment
  ├─ PaymentCoverage
  ├─ SpecialCollectionAssignment
  ├─ Tenant
  │    └─ TenantVehicle
  └─ ResidentVehicle

Payment
  ├─ PaymentCoverage (coverage rows — one per month covered)
  └─ Upload (receipt files)

SpecialCollection
  ├─ SpecialCollectionAssignment (one per resident)
  └─ PublicPaymentSubmission

PublicPaymentSubmission
  └─ Upload

FeePlan ── PaymentCoverage
```

---

## Models

### Resident
Core entity. `unitNumber` is the unique identifier (e.g. `"A-01-02"`).

**Status values:** `ACTIVE` · `EXEMPT` · `FOR_SALE` · `MOVED_OUT`

See [[Resident Management]].

---

### Tenant
A person renting a unit. Belongs to a `Resident` (cascade delete).  
Has its own vehicle list via `TenantVehicle`.

---

### ResidentVehicle / TenantVehicle
Vehicle registration per owner. Stores make, model, plate number.  
Both cascade-delete when their parent is deleted.

---

### Payment
A financial transaction recorded by staff.

| Field | Notes |
|---|---|
| `paymentType` | `MONTHLY_FEE` or `SPECIAL_COLLECTION` |
| `amountSen` | Integer — amount in sen (1/100 RM) |
| `method` | `CASH` · `BANK_TRANSFER` · `DUITNOW_QR` · `EWALLET` · `CHEQUE` · `OTHER` |
| `coverages` | → `PaymentCoverage[]` — which months this payment covers |
| `uploads` | → `Upload[]` — attached receipts |

See [[Payment System]].

---

### PaymentCoverage
Maps a payment to a specific `(resident, year, month)` tuple.

| Field | Notes |
|---|---|
| `amountApplied` | Sen applied to this month |
| `status` | `PAID` · `PARTIAL` · `ADJUSTED` |
| `feePlanId` | Optional — links to the `FeePlan` active at that time |

Unique constraint: `(residentId, year, month, paymentId)`.

---

### FeePlan
Defines the monthly fee amount for a date range. Allows the fee to change over time.  
`amountSen` default is 5000 sen = RM 50.

---

### SpecialCollection
A one-off levy (e.g. gate repair, community event).

**Status:** `DRAFT` → `ACTIVE` → `CLOSED`

Each active collection spawns `SpecialCollectionAssignment` rows — one per assigned resident. See [[Special Collections]].

---

### PublicPaymentSubmission
An unverified payment submitted by a resident via the public form.

**Status flow:** `PENDING_REVIEW` → `APPROVED` | `REJECTED` | `QUARANTINED`

On approval, a real `Payment` is created. See [[Public Submission Flow]].

---

### Upload
A file (receipt/proof) stored in GCS. Can be attached to a `Payment` or a `PublicPaymentSubmission`.

See [[File Uploads]].

---

### User
Admin/AJK staff account. Stores `passwordHash` (bcrypt). See [[Authentication & Authorization]].

**Roles:** `ADMIN` · `AJK` · `VIEWER`

---

### AuditLog
Append-only log of entity changes. Stores `beforeJson` / `afterJson` snapshots and `ipAddress`.

---

## Prisma Client Setup

**[lib/prisma.ts](lib/prisma.ts)** exports a singleton `prisma` client.  
Uses `@prisma/adapter-neon` in production (serverless WebSocket) and falls back to `@prisma/adapter-pg` for local dev.
