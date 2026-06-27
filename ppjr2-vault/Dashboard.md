# Dashboard

Part of [[Architecture Overview]]. Related: [[Payment System]], [[Public Submission Flow]], [[Special Collections]], [[Resident Management]].

---

## Purpose

The main landing page for authenticated staff (`/dashboard`). Provides a live snapshot of collection health and a review queue for pending public submissions.

---

## KPI Cards

| Card | Data Source |
|---|---|
| **This Month's Collection** | Sum of `MONTHLY_FEE` payments in current calendar month |
| **Active Residents** | Count of residents with status `ACTIVE` |
| **Pending Review** | Count of `PublicPaymentSubmission` with `PENDING_REVIEW` |
| **Special Collections** | Aggregate due vs paid across all `ACTIVE` special collections |

Monthly target = `activeResidents × RM 50 (5000 sen)`.

---

## Year-to-Date Panel

Shows cumulative monthly fee collection from January through the current month.

Formula:
```
YTD target = currentMonth × residentCount × 5000 sen
YTD gap    = max(0, ytdTarget - ytdCollected)
```

---

## Pending Submissions Queue

Shows up to 5 most recent `PENDING_REVIEW` submissions inline with:
- Unit number + resident name
- Payment type badge
- Coverage period
- Amount
- Receipt file preview ([[File Uploads]])
- Inline Approve / Reject buttons

If more than 5 pending, a "View all →" link goes to `/payments`.

---

## Alert Banner

If any submissions are pending review, an amber warning banner appears at the top with a direct link to the review queue.

---

## Quick Links

- `/residents` — Resident Ledger
- `/special-collections` — Extra Collections

---

## Source

[app/dashboard/page.tsx](app/dashboard/page.tsx) — fully server-rendered (`force-dynamic`).  
All data fetched in a single `Promise.all()` for parallel execution.
