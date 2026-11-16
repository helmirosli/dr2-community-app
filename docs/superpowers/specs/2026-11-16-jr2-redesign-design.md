# JR2 Desa Restu: Redesign & Re-engineering Design

Status: draft for approval · Date: 2026-11-16 · Visual concept: published artifact (link in PR)

## 1. Why

The backend is solid: Prisma models, coverage allocation, duplicate checks, review flow, exports, audit log. The **front door is the problem**:

- `/` redirects to `/login`. Residents (the biggest audience, ~30 houses, arriving from a WhatsApp group link on a phone) land on a staff login screen. `/status` and `/submit` are only linked from there.
- `/status` copies the old Excel sheet: a 12-month table that scrolls sideways on a phone. "Has my house paid?" takes a scroll-and-squint.
- `/submit` is one long form where the resident types months and an amount. The system already knows the fee (RM50) and the house's paid-until month, so it can work these out instead.
- Visual identity: the app uses generic corporate blue (`#0b5fff`), while the JR2 logo is navy with lime and cyan. The app doesn't look like it belongs to the community.
- Admin: reviewing submissions (the most frequent AJK job) is split across the dashboard widget and `/payments`, with no side-by-side receipt view and no mobile-friendly flow.

## 2. Goals / non-goals / anti-goals

**Goals**
1. A resident can answer "is my house paid?" in under 10 seconds on a phone, with no login.
2. A resident can submit payment proof in 3 short steps, with the amount calculated for them.
3. An AJK can clear the review queue from a phone: receipt and details on one screen, approve in one tap.
4. One visual identity taken from the JR2 logo, used on both the public and admin sides.
5. Remove the duplicated logic that will cause bugs when the fee changes.

**Non-goals**
- No resident accounts or login.
- No online payment gateway. Residents still pay by bank transfer or DuitNow and upload proof.
- No database or stack change (stays on Next.js 16, Prisma, Neon, GCS, Tailwind v4).
- No component library (shadcn etc.). The existing `ui-*` CSS classes are extended.

**Anti-goals (a failure even if it works)**
- The public pages expose phone numbers, receipts, references or amounts owed by name beyond what the WhatsApp sheet already shows (house no. + name + monthly status).
- Neon glow everywhere. The logo's neon belongs on the public hero only, never on tables or forms.
- A resident has to understand "coverage", "submission" or "special collection". Public copy uses *Yuran bulanan*, *Kutipan khas*, *Bukti bayaran*.

## 3. Design concept: "Pondok Pengawal" (the guardhouse)

The fee pays for the guardhouse, so the design uses its look: **night side** for residents (navy sky, the lime roof and cyan sign of the logo, like the guardhouse lit up at night) and **day side** for AJK (a calm, light ledger with the same accents used only to show status).

### Tokens (replace `app/globals.css` `:root`)

| Token | Value | Use |
|---|---|---|
All colours are sampled from `public/jr2-logo.jpeg`.

| Token | Value | Use |
|---|---|---|
| `--night` | `#050A1A` | dark bands, admin sidebar |
| `--night-2` / `--night-3` | `#0B1636` / `#13224A` | cards on dark |
| `--lime` (roof) | `#8EE53F` | primary action on dark |
| `--leaf` | `#2EB84A` | "Paid" |
| `--cyan` (RESTU) | `#22C7F2` | links on dark, focus ring, "Pending review" |
| `--blue` (SEPANG) | `#2463E8` | links/buttons on light |
| `--blend` | `linear-gradient(100deg,#8EE53F,#2EB84A 30%,#22C7F2 65%,#2463E8)` | gradient headline words, big numbers, badges. Use it at most once per screen |
| `--paper` / `--white` | `#F5F5F7` / `#FFFFFF` | light bands, admin background |
| `--ink` / `--ink-2` | `#1D1D1F` / `#6E6E73` | text on light |
| `--due` | `#FF5A36` | unpaid |
| `--hold` | `#8E9AAF` | For sale / Moved out / Exempt (neutral, no shame) |

**Style direction (user request: "ala Apple website"):**
- Full-bleed bands that alternate between night and paper/white.
- Huge, tight headlines (`clamp(2.6rem,7vw,5.2rem)`, letter-spacing −0.025em), each a short two-line statement. The second line uses the `--blend` gradient text.
- One "product" visual per band, centred: the logo (with a floating glow) until OpenArt A1 exists, then phone and Mac mockups.
- A sticky glass nav (`backdrop-filter: blur(20px)`, 48px tall) with a lime "Hantar bukti" pill.
- Bento highlight tiles (28px radius) that mix night, white and gradient tiles.
- Pill CTA plus "text link ›" pairs.
- Motion is limited to a slow logo float and a glow breathe, both disabled under `prefers-reduced-motion`.
- The admin side uses the same tokens but stays dense and calm: no big headlines inside the app.

Fonts: replace Lexend/Source Sans 3 with **Inter Tight** (display, 600–800) and **Inter** (body) via `next/font/google`. They are the closest Google Fonts match to Apple's SF. All money uses `tabular-nums`. The base size on public pages is 17px.

### Status language (used everywhere: grid, tiles, pills, exports)

| State | Colour | Label BM / EN |
|---|---|---|
| Paid | roof/leaf | Sudah bayar / Paid |
| Paid ahead | leaf outline | Bayar awal / Paid ahead |
| Pending review | sign | Sedang disemak / Pending |
| Partial | amber `#E0A100` | Separa / Partial |
| Unpaid | due | Belum bayar / Unpaid |
| Not applicable | hold | Dijual / Pindah / Dikecualikan |

## 4. Information architecture

```
PUBLIC (no login, mobile-first)          ADMIN / AJK (login)
/                 Home  (NEW)            /dashboard   Today
/rumah/[unit]     My house (NEW)         /review      Review inbox (NEW, moved out of /payments)
/status           Status board (rework)  /residents   Houses: tile map + table
/submit           Pay & send proof       /payments    Payment ledger
                  (3-step rework)        /special-collections, /reports, /settings (restyle only)
/login            Staff login (restyle)
```

Route groups: `app/(public)` gets its own layout (night side). A new `app/(admin)` group holds every staff route, and its layout runs the auth check and draws the shell. This replaces `layout-wrapper.tsx` checking `getCurrentUser()` around everything. Today a logged-in AJK who opens `/submit` gets the admin sidebar around a public page, and the route groups fix that.

## 5. Screens

### 5.1 Home `/` (public)
- Hero: generated night illustration of the guardhouse and boom gate (OpenArt asset A1), the logo, and the line *"Selamat datang ke Desa Restu 2"*.
- **Main action:** a large field *"No. rumah anda"* plus a button **Semak** that goes to `/rumah/[unit]`. The field starts empty on every visit (decided 2026-11-16: no remembered unit).
- Two secondary cards: **Hantar bukti bayaran** → `/submit` and **Papan status** → `/status`.
- **Kutipan khas** strip: any ACTIVE special collection (e.g. "Kawalan 24 jam Raya") shows the title, the amount per house and a community progress bar (houses paid / assigned). No names.
- **Collection this month**, community-wide: "21 / 27 rumah sudah bayar", shown as a bar. This is the transparency the WhatsApp sheet gave people, without a giant table.
- **Cara bayar** card: bank name, account holder, and account number with a copy button. These come from env vars (`NEXT_PUBLIC_BANK_NAME`, `NEXT_PUBLIC_BANK_ACCOUNT`, `NEXT_PUBLIC_BANK_HOLDER`), with dummy values until the AJK supplies the real ones. **No DuitNow QR:** a QR payment arrives without a reference the AJK can match to a house, so residents must transfer to the account number with their house number as the reference. (Builder's call: no settings table until the details change more than once a year.)

### 5.2 My house `/rumah/[unit]` (public, NEW)
- Header: house no. and the first name only.
- A large status chip for this month, plus "Bayaran sehingga: **Ogos 2026**".
- A 12-month pill row for the selected year (‹ 2026 ›). Each pill shows its state colour, and tapping one shows the amount and payment date (no reference numbers).
- Any pending submissions are listed as "Sedang disemak sejak 14 Nov".
- Main action: **Bayar bulan seterusnya** → `/submit?unit=12`, which pre-fills step 1.
- Uses `getYearGridData` for one unit, so no new query logic is needed.

### 5.3 Status board `/status` (rework)
- ≥ 768px: keep the year grid (people like that it looks like the sheet), with the new status colours, a sticky header and a sticky house column.
- < 768px: switch to **house cards**: "No. 12 · Abuzar" with a 12-dot strip and the paid-until month. Add filter chips: Semua / Belum bayar / Sedang disemak. Search by house number.
- Delete the local carry-forward allocator in `status/page.tsx`. Pending months come from `lib/payments/coverage.ts` (one allocator, one fee).

### 5.4 Pay & send proof `/submit` (3-step rework)
One page with client-side steps, still one Server Action at the end, and nothing persisted between steps.
1. **Rumah** – pick the house (searchable by number). The page shows "Bayaran sehingga Ogos 2026" and pre-selects the next unpaid month.
2. **Bayaran** – choose Yuran bulanan or Kutipan khas.
   - Monthly: month **chips** (Sep, Okt, Nov, Dis …) with quick picks *1 bulan / 3 bulan / Hingga Disember*. The amount is **calculated** (n × fee) and shown large. A resident who paid a different amount can switch on "Jumlah lain" to type it.
   - Special: pick the collection, and the amount comes from `amountPerResident`.
   - Method: Bank transfer / DuitNow, with the payment details from 5.1 shown inline.
3. **Bukti** – upload with `accept="image/*,application/pdf"` and `capture="environment"` so the camera opens directly on a phone. Show a thumbnail preview, the reference no. (optional), the phone no., then Turnstile, then **Hantar**.
- Success screen: a reference code, "AJK akan semak dalam 1–3 hari", and a **Kongsi ke WhatsApp** link (`https://wa.me/?text=…`).
- Validation stays in `lib/validation.ts` (server). The client steps only stop a resident from going forward with an empty required field.

### 5.5 Admin shell
- Desktop: a navy sidebar (the night side carries over as the brand) with the logo and grouped nav. The content area is paper. The global search stays in the top bar.
- Mobile: a **bottom tab bar** (Hari ini · Semak (badge) · Rumah · Rekod + · Lagi) instead of the hamburger.

### 5.6 Today `/dashboard`
In order: (1) the review queue summary with a big button **Semak 4 bayaran** that leads to `/review`; (2) a **house strip** of 30 small tiles coloured by this month's status, where clicking one opens the resident; (3) KPIs: collected this month vs target, YTD, outstanding, active special collection; (4) recent activity from the AuditLog (last 8).
Targets use `FeePlan`/`DEFAULT_MONTHLY_FEE_SEN`, never a literal `5000`.

### 5.7 Review inbox `/review` (NEW)
- Desktop: two panes. On the left, the pending list (house, name, amount, months, age). On the right, the receipt preview (image/PDF via the existing `file-viewer`) next to the claim and **what the system expects**: the expected amount for those months, any overlapping coverage, the duplicate file-hash warning, and the house's paid-until. The buttons are **Lulus** (A) and **Tolak** (R, reason required), then the next item.
- Mobile: one item per screen with Lulus/Tolak buttons pinned at the bottom.
- Reuses the `review-submissions` actions unchanged.

### 5.8 Houses `/residents`
A toggle between **Peta** (a tile grid in house-number order, coloured by status, the same tiles as the dashboard strip) and **Senarai** (the current table, restyled).

## 6. Re-engineering (code changes that aren't visual)

1. **One fee source.** Every literal `5000` in app code now uses `DEFAULT_MONTHLY_FEE_SEN` from `lib/money.ts`. (Done in phase 0. Reading the `FeePlan` table is deferred until the fee actually changes, since today it never does.)
2. **One allocator.** `buildMonthlyCoverageRows` in `lib/payments/coverage.ts` is the only allocator: official payments, approved submissions, and the pending preview on `/status` and `/reports` (`getPendingSubmissionsMap`). Guarded by `npm run check:coverage`. (Done in phase 0.)
3. **Delete dead code.** `app/components/search-select.tsx` has 0 imports. Merge `searchable-select` and `searchable-dropdown` into one combobox if their APIs fit (builder's call).
4. **Route groups** `(public)` / `(admin)` replace the global `LayoutWrapper` auth check (§4).
5. **Shared `StatusPill` + `HouseTile` components** drive the status language from §3, used by status, home, dashboard, residents and reports.
6. **Root `/`** becomes the public home instead of `redirect("/login")`.
7. **OG metadata:** `opengraph-image.png` (asset A5) and a BM title/description. Links pasted in WhatsApp then show a proper preview card.
8. Keep `xlsx` (import comparison) and `exceljs` (export). Both are in use.

Before writing route or metadata code, read `node_modules/next/dist/docs/` (AGENTS.md: Next 16 differs from older versions).

## 7. OpenArt assets

OpenArt MCP is configured (`openart`, local scope) but must be authenticated via `/mcp` before use. Generate the assets, then save them to `public/art/`. Keep each one under 300 KB as WebP.

**Style update (supersedes the flat-vector prompts below):** use an Apple product-shot look. The subject is an isometric 3D clay miniature of a Malaysian double-storey terrace street with a guardhouse and red-white boom gate, on a matte `#050A1A` studio backdrop, with lime `#8EE53F` and cyan `#22C7F2` rim light, plenty of negative space and no text. Spot illustrations (A3, A4) go on a white seamless background. The exact prompts are on the concept page's OpenArt section. Until A1 exists, the home hero shows the JR2 logo itself as the product.

| ID | Where | Size | Prompt |
|---|---|---|---|
| A1 | Home hero | 1600×900 + 800×1000 mobile crop | "Flat vector illustration, quiet Malaysian terrace-house neighbourhood at night, small guardhouse with red-white boom gate in foreground, warm window lights, deep navy sky (#0A1430), lime green (#8BE03A) roof accents and cyan (#1FB8E8) signage glow, palm and rain trees, calm and safe mood, generous empty sky at top for headline text, no people, no text" |
| A2 | Login side panel | 1000×1400 | "Same style as A1, close-up of the guardhouse at dusk, guard's lamp glowing cyan, lime-roofed terrace houses behind, minimal, flat vector, navy background, no text" |
| A3 | Empty state: review inbox clear | 600×450, transparent | "Flat vector spot illustration, cup of teh tarik on a guardhouse desk next to a tidy stack of receipts with a green check mark, navy and lime palette, simple shapes, transparent background" |
| A4 | Submit success | 600×450, transparent | "Flat vector spot illustration, a phone sending a receipt paper plane toward a small guardhouse, lime and cyan accents on navy outlines, transparent background, cheerful" |
| A5 | WhatsApp/OG card | 1200×630 | "Flat vector banner, Malaysian terrace houses and guardhouse at night, navy sky, lime and cyan lights, empty left half for title text, no text" (the title is overlaid in code) |
| A6 | Kutipan khas banner (Raya) | 1200×400 | "Flat vector banner, guardhouse decorated with ketupat and pelita lights at night, navy sky, lime and cyan palette with warm gold, festive but calm, no text" |

Reject any output that contains text or a logo. The real logo `public/jr2-logo.jpeg` is placed in code.

## 8. Delivery phases (one PR each)

| # | Phase | Ships | Risk |
|---|---|---|---|
| 0 | Re-engineering clean-up (§6 items 1–3) | no visual change | low, covered by a fee/coverage self-check |
| 1 | Tokens, `StatusPill`/`HouseTile`, route groups and the new admin shell incl. mobile tab bar | new look for staff | medium (layout move) |
| 2 | Public home `/`, `/rumah/[unit]`, `/status` cards | resident front door | low |
| 3 | 3-step `/submit` + success/share | easier submissions | medium (form) |
| 4 | `/review` inbox, Today dashboard, residents tile map | faster AJK work | medium |
| 5 | OpenArt assets A1–A6 + OG image | polish | low |

Each phase: `npm run lint && npm run build`, check at 390px and 1280px, and check both locales (en/ms).

## 9. Open questions (sensible defaults chosen; change if wrong)

- **Names on public pages:** default is first name only on `/rumah` and full name on `/status`, the same as the WhatsApp sheet today.
- **Bank details:** env vars only, no QR (decided 2026-11-16: QR payments can't be traced to a house). Dummy values for now; the real bank name and account number come later and only need the env vars changed.
- **Unit lookup is guessable** (house 1–30): acceptable because only status is shown, which is already public in the WhatsApp sheet.
