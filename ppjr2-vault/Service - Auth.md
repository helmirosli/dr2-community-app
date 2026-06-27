# Service — Auth

Part of [[Architecture Overview]] → [[Authentication & Authorization]].

**Source:** [lib/auth.ts](lib/auth.ts)

---

## Responsibilities

All session lifecycle logic: creating, parsing, and verifying the signed session cookie. Also provides auth guard functions used by pages and server actions.

---

## Session Token Format

```
base64url(JSON) . base64url(HMAC-SHA256 signature)
```

Payload: `{ userId: string, exp: number }` (unix timestamp)

Token is stored in a cookie named `dr2_session` with:
- `httpOnly: true`
- `sameSite: "lax"`
- `secure: true` in production
- 8-hour expiry

---

## Key Functions

### `setAuthSession(userId)`
Creates a signed token and sets the `dr2_session` cookie. Called on successful login.

### `clearAuthSession()`
Deletes the `dr2_session` cookie. Called on logout.

### `getCurrentUser()`
Reads and verifies the cookie token. Returns `DashboardUser | null`.
- Uses `timingSafeEqual` to prevent timing attacks on signature comparison
- Fetches user from DB to confirm they still exist and have a valid role
- Returns `null` for `VIEWER` role (they can't access the dashboard)

### `requireDashboardUser()`
Calls `getCurrentUser()` — redirects to `/login` if result is null. Used in Server Components.

### `assertDashboardUser()`
Same check but throws instead of redirecting. Used inside Server Actions.

### `requireDashboardAdmin()`
Redirects to `/dashboard` if user is not `ADMIN`. Used for ADMIN-only pages like `/settings`.

---

## Environment Variables

| Variable | Purpose |
|---|---|
| `AUTH_SECRET` or `SECRET_KEY` | HMAC signing key, min 16 chars |

---

## Related

- [[Authentication & Authorization]] — full auth architecture
- [[Service - User Management]] — manages the User records this service reads
- [[Data Model]] — `User` model, `UserRole` enum
