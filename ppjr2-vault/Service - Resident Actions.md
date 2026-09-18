# Service — Resident Actions

Part of [[Architecture Overview]] → [[Resident Management]].

**Source:** [lib/actions/residents.ts](lib/actions/residents.ts)

---

## Responsibilities

Server actions for creating and updating `Resident` records. Normalises input, writes audit logs, revalidates related pages.

---

## Zod Schema

Fields validated: `unitNumber` (max 30, forced uppercase), `name`, `phone`, `email` (optional, validated format), `streetBlock`, address fields (`addressLine1/2`, `city`, `state`, `zipCode`), `status` enum, `notes`.

---

## `createResident(_previousState, formData)`

1. `assertDashboardUser()`
2. Zod validation + normalise (unit number uppercased, empty strings → `null`)
3. `prisma.resident.create()`
4. `AuditLog` (`action: "CREATE"`, `afterJson: normalised data`)
5. On unique-constraint violation → return error (unit number already exists)
6. `revalidatePath("/dashboard", "/residents")` + `redirect` to new resident detail page

---

## `updateResident(residentId, _previousState, formData)`

1. `assertDashboardUser()`
2. Zod validation + normalise
3. Fetch existing resident (for `beforeJson` in audit log)
4. `prisma.resident.update()`
5. `AuditLog` (`action: "UPDATE"`, before + after snapshots)
6. `revalidatePath` + `redirect` to resident detail

---

## Related Actions

These live in separate files but follow the same pattern:

| File | Covers |
|---|---|
| `lib/actions/tenants.ts` | Tenant CRUD under a resident |
| `lib/actions/resident-vehicles.ts` | Vehicle CRUD for residents |
| `lib/actions/tenant-vehicles.ts` | Vehicle CRUD for tenants |

---

## Related

- [[Resident Management]] — domain overview
- [[Audit Log]] — every mutation is logged
- [[Data Model]] — `Resident`, `Tenant`, `ResidentVehicle`, `TenantVehicle` models
