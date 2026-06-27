# Service — User Management

Part of [[Architecture Overview]] → [[Authentication & Authorization]].

**Source:** [lib/actions/user-management.ts](lib/actions/user-management.ts)

---

## Responsibilities

ADMIN-only server actions for managing staff user accounts — creating, deleting, changing roles, and changing passwords.

---

## Auth Guard

All functions except `changePassword` call `requireDashboardAdmin()` — non-ADMIN users are redirected away. `changePassword` is self-service (any logged-in user, verified by checking `userId` in the form).

---

## `createUser(_previousState, formData)`

- Required fields: `name`, `email`, `password`, `role` (defaults to `AJK`)
- Checks for existing user with same email
- Hashes password with `bcrypt` (cost factor 10)
- `prisma.user.create()`
- `revalidatePath("/settings")`

---

## `deleteUser(userId)`

- `requireDashboardAdmin()`
- `prisma.user.delete()`
- `revalidatePath("/settings")`

No cascade protection — if the user has linked payments/submissions, those FK references will become `null` (schema has `onDelete: SetNull` implied by optional `createdById`).

---

## `updateUserRole(userId, role)`

- `requireDashboardAdmin()`
- Validates role is one of `ADMIN` | `AJK` | `VIEWER`
- `prisma.user.update({ role })`
- `revalidatePath("/settings")`

---

## `changePassword(_previousState, formData)`

Self-service — no admin check, but requires `userId` in the form.

- Fields: `userId`, `currentPassword`, `newPassword`, `confirmPassword`
- `newPassword` must be ≥ 8 characters and match `confirmPassword`
- Verifies current password with `bcrypt.compare`
- Hashes new password with `bcrypt` (cost 10)
- `prisma.user.update({ passwordHash })`

---

## Related

- [[Authentication & Authorization]] — session, roles, guards
- [[Data Model]] — `User` model
