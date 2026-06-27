# Resident Management

Part of [[Architecture Overview]]. Related: [[Data Model]], [[Payment System]].

---

## Resident

The core entity of the system. Each resident represents one **unit** in the neighbourhood.

**Unique identifier:** `unitNumber` (e.g. `"A-01-02"`)

### Status Values

| Status | Meaning |
|---|---|
| `ACTIVE` | Paying resident, counted in monthly fee targets |
| `EXEMPT` | Not required to pay (e.g. committee member) |
| `FOR_SALE` | Unit is on market, may still owe fees |
| `MOVED_OUT` | Vacated — excluded from active counts |

Only `ACTIVE` residents are counted in the monthly collection target on the [[Dashboard]].

---

## Tenants

A resident can have multiple tenants (renters). Tenants are sub-records under a resident.

- Cascade-deleted when their parent resident is deleted.
- Each tenant has their own contact info and vehicle list.

**Routes:** `/residents/[id]/tenants/`  
**Action:** `lib/actions/tenants.ts`

---

## Vehicles

Two separate vehicle models:

| Model | Owner |
|---|---|
| `ResidentVehicle` | Belongs directly to a Resident |
| `TenantVehicle` | Belongs to a Tenant |

Both store make, model, and plate number. Both cascade-delete with their parent.

**Resident vehicles:** `/residents/[id]/vehicles/`  
**Tenant vehicles:** `/residents/[id]/tenant/[tenantId]/vehicles/`

---

## CRUD Pages

| Path | Purpose |
|---|---|
| `/residents` | Paginated list with search |
| `/residents/new` | Create resident |
| `/residents/[id]` | View resident detail + payment history |
| `/residents/[id]/edit` | Edit resident info |

The detail page shows the full payment ledger for the resident — all `PaymentCoverage` rows displayed as a month grid.

---

## Search

Global search and resident-specific search are served by API routes:
- `app/api/search/global/route.ts`
- `app/api/search/residents/route.ts`

Used by the `GlobalHeaderSearch` and `SearchableSelect` components.

---

## Server Actions

`lib/actions/residents.ts` — create, update, delete residents  
`lib/actions/tenants.ts` — tenant CRUD  
`lib/actions/resident-vehicles.ts` — resident vehicle CRUD  
`lib/actions/tenant-vehicles.ts` — tenant vehicle CRUD
