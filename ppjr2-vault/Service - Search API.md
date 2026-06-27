# Service — Search API

Part of [[Architecture Overview]].

**Sources:**
- [app/api/search/global/route.ts](app/api/search/global/route.ts)
- [app/api/search/residents/route.ts](app/api/search/residents/route.ts)

---

## Responsibilities

JSON API routes that power the header search and resident-picker dropdowns. Both require an authenticated dashboard session.

---

## `GET /api/search/global`

Used by `GlobalHeaderSearch` in the nav header.

Accepts `?q=` query param. Searches across:
- Residents — by `unitNumber`, `name`
- Returns a combined list of results with type labels and links

Returns early with empty results if `q` is blank or too short.

---

## `GET /api/search/residents`

Used by `SearchableSelect` / `SearchableDropdown` components in forms (e.g. payment form resident picker).

Accepts `?q=` query param. Searches `Resident` by `unitNumber` or `name`.

Returns a JSON array of `{ id, unitNumber, name, status }` for use in dropdown options.

---

## Auth

Both routes call `getCurrentUser()` from [[Service - Auth]] and return `401` if no valid session.

---

## Related

- [[Service - Auth]] — session check
- [[Resident Management]] — data being searched
- [[Architecture Overview]] — sits in `app/api/`
