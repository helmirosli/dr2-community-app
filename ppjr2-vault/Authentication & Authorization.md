# Authentication & Authorization

Part of [[Architecture Overview]].

---

## Session Mechanism

The app uses a **custom, stateless session cookie** — no JWT library, no NextAuth.

**Cookie name:** `dr2_session`  
**TTL:** 8 hours  
**Algorithm:** HMAC-SHA256 (Node `crypto` built-in)

### Token format

```
base64url(JSON payload) . base64url(HMAC signature)
```

Payload:
```json
{ "userId": "<cuid>", "exp": <unix timestamp> }
```

The signature is verified with `timingSafeEqual` to prevent timing attacks.

**Source:** [lib/auth.ts](lib/auth.ts)

---

## User Roles

Defined in [[Data Model]] as the `UserRole` enum.

| Role | Access |
|---|---|
| `ADMIN` | Full access including user management, can delete users |
| `AJK` | Can record payments, approve/reject submissions, manage residents |
| `VIEWER` | Read-only (blocked at `getCurrentUser` — currently not surfaced in UI) |

Only `ADMIN` and `AJK` pass `getCurrentUser()`. A `VIEWER` token returns `null` and redirects to login.

---

## Auth Guards

| Function | Behavior |
|---|---|
| `getCurrentUser()` | Returns `DashboardUser \| null` — no redirect |
| `requireDashboardUser()` | Redirects to `/login` if no valid session |
| `assertDashboardUser()` | Throws if no valid session (use inside Server Actions) |
| `requireDashboardAdmin()` | Redirects to `/dashboard` if not ADMIN |

---

## Public Routes

The `(public)` route group (`app/(public)/`) bypasses all auth guards. Pages there:
- `/submit` — [[Public Submission Flow]]
- `/status` — submission status lookup

---

## Setup Route

`/setup` is the first-run wizard. It creates the first `ADMIN` user when no users exist. After that it becomes inaccessible.

---

## Environment Variables

| Variable | Purpose |
|---|---|
| `SECRET_KEY` or `AUTH_SECRET` | HMAC signing key (≥ 16 chars required) |
