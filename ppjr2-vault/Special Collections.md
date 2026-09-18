# Special Collections

Part of [[Architecture Overview]]. Related: [[Data Model]], [[Payment System]], [[Public Submission Flow]].

---

## What Are Special Collections?

One-off levies charged to residents for specific events or needs — e.g. gate repair, community festival, infrastructure upgrade. Unlike the regular monthly fee, these are created on demand and can have different amounts per resident.

---

## Lifecycle

```
DRAFT → ACTIVE → CLOSED
```

| Status | Meaning |
|---|---|
| `DRAFT` | Being configured, not yet visible to residents |
| `ACTIVE` | Collecting payments; appears in public submission form |
| `CLOSED` | Collection ended |

---

## Data Model

**`SpecialCollection`** — the levy definition (title, description, amount per resident, due date, event dates).

**`SpecialCollectionAssignment`** — one row per assigned resident.

| Field | Notes |
|---|---|
| `amountDue` | What this resident owes (sen) |
| `amountPaid` | Running total paid so far (sen) |
| `status` | `PENDING_REVIEW` · `APPROVED` · `REJECTED` · `QUARANTINED` |

---

## Workflow

1. ADMIN/AJK creates a `SpecialCollection` in `DRAFT`.
2. Assignments are created for selected residents.
3. Status set to `ACTIVE` — residents can now submit payments via [[Public Submission Flow]] and select this collection.
4. As payments come in, `amountPaid` on each assignment is updated.
5. Collection is closed when done.

---

## Dashboard Stats

The [[Dashboard]] shows a progress card for all active special collections:
- Total due (sum of all `amountDue`)
- Total paid (sum of all `amountPaid`)
- Outstanding balance
- Progress bar (%)

---

## Routes

| Path | Purpose |
|---|---|
| `/special-collections` | List all collections |
| `/special-collections/new` | Create new |
| `/special-collections/[id]` | View + manage assignments |
| `/special-collections/[id]/edit` | Edit details |

**Action:** `lib/actions/special-collections.ts`
