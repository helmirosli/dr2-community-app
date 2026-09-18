# Service — Auth Actions

Part of [[Architecture Overview]] → [[Authentication & Authorization]].

**Source:** [lib/actions/auth.ts](lib/actions/auth.ts)

---

## Responsibilities

Server actions for login and logout. The only entry point into the session system from form submissions.

---

## `login(_previousState, formData)`

1. Extracts `email` + `password` from form data
2. Looks up user by email via Prisma
3. Returns error if user not found (generic message — no email enumeration)
4. `bcrypt.compare(password, user.passwordHash)` — rejects if mismatch
5. Calls `setAuthSession(user.id)` from [[Service - Auth]] to write the cookie
6. `redirect("/dashboard")`

---

## `logout()`

1. Calls `clearAuthSession()` from [[Service - Auth]] to delete the cookie
2. `redirect("/login")`

---

## Related

- [[Service - Auth]] — session cookie management
- [[Service - User Management]] — creates/deletes the accounts being logged into
- [[Authentication & Authorization]] — full auth architecture
