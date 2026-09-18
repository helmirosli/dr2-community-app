# Service — Validation

Part of [[Architecture Overview]].

**Source:** [lib/validation.ts](lib/validation.ts)

---

## Responsibilities

Shared Zod schemas for form validation at system boundaries. Currently houses the public submission schema; staff-side schemas are defined inline in their respective action files.

---

## `publicSubmissionSchema`

Used by [[Service - Public Submissions]] to validate the unauthenticated submit form.

**Fields:**

| Field | Rule |
|---|---|
| `unitNumber` | Required, max 30 chars |
| `residentName` | Optional |
| `phone` | Optional |
| `paymentType` | `MONTHLY_FEE` \| `SPECIAL_COLLECTION` |
| `amount` | Positive number, max 100,000 RM |
| `paymentDate` | Required string (date) |
| `method` | One of 6 payment method enums |
| `coverageStartYear/Month` | 2020–2100, 1–12 |
| `coverageEndYear/Month` | 2020–2100, 1–12 |
| `specialCollectionId` | Optional |
| `referenceNo`, `notes` | Optional |
| `website` | **Honeypot** — max 0 chars; bots that fill it in fail validation |

**Cross-field rules (`.superRefine`):**
- End month must be ≥ start month
- Coverage span must be ≤ 24 months

**Transform:**
- `amount` (RM float) → `amountSen` (integer sen) via `ringgitToSen()`
- Empty optional strings → `undefined`

---

## Exported Types

```ts
type PublicSubmissionInput = z.infer<typeof publicSubmissionSchema>;
```

---

## Related

- [[Service - Public Submissions]] — primary consumer
- [[Payment System]] — coverage month concepts
