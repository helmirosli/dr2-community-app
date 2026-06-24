# Design Revamp — Progress Tracker

**Target**: 60+ pages across admin, public, and auth layouts
**Goal**: Standardize borders (`border-border-subtle`), shadows, buttons, forms, tables, badges, headers

---

## PHASES COMPLETE

### Phase 1: Global Design Tokens ✅
- `app/globals.css` — CSS tokens for shadows, borders, radius, transitions

### Phase 2: Layout Shell ✅
- `app/layout-wrapper.tsx` — sidebar gradient, border, content bg

### Phase 3: Navigation ✅
- `app/nav-sidebar.tsx` — sidebar styling, mobile dropdown

### Phase 4: Button Standardization ✅
- Applied primary, secondary, small button styles

### Phase 5: Card & Surface Standardization ✅
- Unified card pattern: `rounded-xl border border-border-subtle bg-white shadow-sm`

### Phase 6: Table Standardization ✅
- Header rows, hover transitions, divide-y

### Phase 7: Form Input Standardization ✅
- Base input, select, textarea, label, field error, search input

### Phase 8: Status Badge Standardization ✅
- ACTIVE, PAID, FOR_SALE, MOVED_OUT, EXEMPT, PENDING_REVIEW, DRAFT, CLOSED badges

### Phase 9: Header Standardization ✅
- Page headers with back links, section labels, H1/section title patterns

### Phase 10: Public Pages ✅
- Public layout, status page, submit page

### Phase 11: Deep Components ✅
- File viewer component

### Phase 12: Cross-Cutting Polish ✅
- Transitions, spacing, max-widths, section titles, helper text, focus management

---

## FILES MODIFIED

### Core (5 files)
| # | File | Status |
|---|------|--------|
| 1 | `app/globals.css` | ✅ Done |
| 2 | `app/layout-wrapper.tsx` | ✅ Done |
| 3 | `app/nav-sidebar.tsx` | ✅ Done |
| 4 | `app/(public)/layout.tsx` | ✅ Done |
| 5 | `app/(public)/public-layout-client.tsx` | ✅ Done |

### Admin Pages (10 files)
| # | File | Status |
|---|------|--------|
| 6 | `app/dashboard/page.tsx` | ✅ Done |
| 7 | `app/residents/page.tsx` | ✅ Done |
| 8 | `app/residents/[id]/page.tsx` | ✅ Done |
| 9 | `app/payments/page.tsx` | ✅ Done |
| 10 | `app/payments/payment-form.tsx` | ✅ Done |
| 11 | `app/residents/resident-form.tsx` | ✅ Done |
| 12 | `app/residents/[id]/edit/page.tsx` | ✅ Done |
| 13 | `app/special-collections/page.tsx` | ✅ Done |
| 14 | `app/reports/page.tsx` | ✅ Done |
| 15 | `app/settings/page.tsx` | ✅ Done (sec1 missing closing `</section>` added before `) : null}`) |

### Nested Admin Pages (6 files)
| # | File | Status |
|---|------|--------|
| 16 | `app/residents/[id]/tenants/tenant-list-view.tsx` | ✅ Done |
| 17 | `app/residents/[id]/tenants/tenant-form.tsx` | ✅ Done |
| 18 | `app/residents/[id]/tenants/[tenantId]/edit/page.tsx` | ✅ Done |
| 19 | `app/residents/new/page.tsx` | ✅ Done |
| 20 | `app/residents/[id]/tenants/new/page.tsx` | ✅ Done |
| 21 | `app/payments/new/page.tsx` | ✅ Done |

### Public Pages (5 files)
| # | File | Status |
|---|------|--------|
| 22 | `app/(public)/status/page.tsx` | ✅ Done |
| 23 | `app/(public)/submit/page.tsx` | ✅ Done |
| 24 | `app/(public)/submit/submit-payment-form.tsx` | ✅ Done |
| 25 | `app/login/page.tsx` | ✅ Done |
| 26 | `app/setup/page.tsx` | ✅ Done |

### Shared Components (2 files)
| # | File | Status |
|---|------|--------|
| 27 | `app/components/file-viewer.tsx` | ✅ Done |

### Special Pages (3 files)
| # | File | Status |
|---|------|--------|
| 28 | `app/special-collections/[id]/edit/page.tsx` | ✅ Done |
| 29 | `app/special-collections/new/page.tsx` | ✅ Done |
| 30 | `app/setup-admin/page.tsx` | ✅ Done |

---

## REMAINING FILES NOT YET EDITED

These 30+ files were in the plan but haven't been touched yet:

### Residents
- `app/residents/[id]/edit/page.tsx` (already listed in admin above)
- Any additional resident form pages not covered

### Payments
- `app/payments/[id]/edit/page.tsx`
- `app/payments/[id]/page.tsx`

### Special Collections
- `app/special-collections/[id]/page.tsx`

### Reports
- Any report page variants

### Components
- Any additional shared components not listed above

### Other Admin Pages
- `app/dashboards/page.tsx` or similar dashboard pages
- Any settings sub-pages beyond `settings/page.tsx`

---

## KNOWN ERRORS / BLOCKERS

### `app/settings/page.tsx` — JSX Structural Error ✅ FIXED
**Status**: Resolved — build passes

**Fix**: Added missing `</section>` closing tag for sec1 (line 61) before `) : null}` at line 129.

**Fixed structure**:
```jsx
            </section>     // closes sec2 (line 76)
          </section>       // closes sec1 (line 61) — NOW PRESENT
          ) : null}       // closes conditional
```

---

## STANDARDIZATION PATTERNS USED

All edits follow these patterns consistently:

**Card**: `rounded-xl border border-border-subtle bg-white shadow-sm`
**Button primary**: `rounded-lg bg-cyan-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-cyan-800 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 disabled:opacity-60`
**Button secondary**: `rounded-lg bg-cyan-50 px-3 py-2.5 text-sm font-semibold text-cyan-700 shadow-sm transition hover:bg-cyan-100`
**Form input**: `w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm shadow-sm transition focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500`
**Back link**: `text-sm font-semibold text-cyan-700 hover:text-cyan-900 transition-colors`
**Table hover**: `transition-colors duration-150 hover:bg-slate-50/60`
**Modal overlay**: `bg-black/40`
**Modal inner**: `bg-white shadow-xl rounded-xl`
**Badge**: `inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset`
**Section label**: `text-sm font-semibold uppercase tracking-wide text-cyan-700`
**Header card**: `flex flex-col gap-4 rounded-xl border border-border-subtle bg-white p-5 shadow-sm`

---

## LAST EDITED SESSION
- Fixed 7 nested admin pages (tenant-list-view, tenant-form, edit tenant, new resident, new tenant, new payment)
- Fixed login page logo shadow
- Attempted settings/page.tsx fix — structural error persists
