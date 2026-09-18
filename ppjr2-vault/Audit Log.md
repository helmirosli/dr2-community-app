# Audit Log

Part of [[Architecture Overview]] → [[Data Model]].

---

## Purpose

Append-only record of every mutation in the system. Written after every successful create/update/delete across all major entities.

---

## Schema

```
AuditLog {
  id         cuid
  entityType String   — e.g. "Resident", "Payment", "PublicPaymentSubmission"
  entityId   String   — ID of the affected record
  action     String   — e.g. "CREATE", "UPDATE", "APPROVE", "REJECT"
  beforeJson String?  — JSON snapshot of the record before the change
  afterJson  String?  — JSON snapshot of the record after the change
  createdBy  String?  — userId of the staff member who triggered it
  ipAddress  String?  — optional, for future use
  createdAt  DateTime
}
```

---

## When It's Written

| Service | Action logged |
|---|---|
| [[Service - Resident Actions]] | `CREATE`, `UPDATE` on Resident |
| [[Service - Payment Actions]] | `CREATE` on Payment |
| [[Service - Special Collection Actions]] | `CREATE`, `UPDATE` on SpecialCollection |
| [[Service - Review Submissions]] | `APPROVE`, `REJECT`, `REJECT_MISSING_RESIDENT`, `REJECT_DUPLICATE_COVERAGE` on PublicPaymentSubmission |

---

## Usage Notes

- Always written **outside** the main `$transaction` — so if the audit write fails, the main operation is not rolled back.
- `beforeJson` / `afterJson` are raw JSON strings, not typed objects.
- No UI to view audit logs yet — they exist in the DB for forensic/compliance purposes.
- `ipAddress` field exists in the schema but is not currently populated.

---

## Related

- [[Data Model]] — `AuditLog` model definition
