# Service — Special Collection Actions

Part of [[Architecture Overview]] → [[Special Collections]].

**Source:** [lib/actions/special-collections.ts](lib/actions/special-collections.ts)

---

## Responsibilities

Server actions for creating and editing `SpecialCollection` records and managing which residents are assigned to them.

---

## Zod Schema

Fields: `title` (max 120), `description`, `amountPerResident` (RM, converted to sen), `dueDate`, `eventStartDate`, `eventEndDate`, `status` (`DRAFT` | `ACTIVE` | `CLOSED`), `assignToAll` checkbox, `selectedResidents` (JSON array of resident IDs).

---

## `createSpecialCollection(_previousState, formData)`

1. `assertDashboardUser()`
2. Validate + parse form
3. `prisma.specialCollection.create()`
4. Assign residents:
   - `assignToAll = true` → fetch all `ACTIVE` residents → `createMany` assignments
   - else → `createMany` from `selectedResidents` array
5. Each assignment: `amountDue = amountSen`, `amountPaid = 0`, `status = PENDING_REVIEW`
6. `AuditLog` (`action: "CREATE"`)
7. `revalidatePath` + `redirect` to collection detail

---

## `updateSpecialCollection(collectionId, _previousState, formData)`

1. `assertDashboardUser()`
2. Validate + parse form
3. Fetch existing collection (for audit `beforeJson`)
4. `prisma.specialCollection.update()`
5. Diff resident assignments:
   - Residents removed from selection → `deleteMany` their assignments
   - New residents added → `createMany` new assignments
6. `AuditLog` (`action: "UPDATE"`, before + after)
7. `revalidatePath` + `redirect`

---

## Assignment Diffing Logic

On update, compares the current set of assigned `residentId`s against the new selection:
- **toRemove** = currently assigned but not in new selection → deleted
- **toAdd** = in new selection but not currently assigned → created

Existing assignments (both old and new selection) are left untouched — `amountPaid` is preserved.

---

## Related

- [[Special Collections]] — domain overview
- [[Audit Log]] — CREATE and UPDATE are logged
- [[Data Model]] — `SpecialCollection`, `SpecialCollectionAssignment`
- [[Service - Review Submissions]] — approval updates `amountPaid` on assignments
