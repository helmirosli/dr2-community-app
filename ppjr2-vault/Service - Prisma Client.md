# Service — Prisma Client

Part of [[Architecture Overview]] → [[Data Model]].

**Source:** [lib/prisma.ts](lib/prisma.ts)

---

## Responsibilities

Exports a singleton `prisma` client used everywhere in the app. Handles the dual-adapter setup for serverless vs local environments.

---

## Adapter Strategy

| Environment | Adapter | Why |
|---|---|---|
| Production (Neon) | `@prisma/adapter-neon` | Neon uses WebSocket-based serverless Postgres; the neon adapter handles connection pooling and the `neonConfig` WebSocket |
| Local dev | `@prisma/adapter-pg` | Standard `pg` driver for a local or conventional Postgres instance |

The `prisma.config.ts` file controls which adapter is active based on `DATABASE_URL` or environment.

---

## Singleton Pattern

The client is instantiated once and reused. In development, Next.js hot reloads can create multiple instances — the singleton is cached on the `global` object to prevent connection pool exhaustion.

---

## Generated Client

Prisma generates its client output to `generated/prisma/` (not the default `node_modules/@prisma/client`). This means all imports use `@/generated/prisma` (aliased in `tsconfig.json`), not `@prisma/client`.

The `postinstall` script in `package.json` runs `prisma generate` automatically after `npm install`.

---

## Schema Location

`prisma/schema.prisma` — all models live in the `desarestu_db` PostgreSQL schema. See [[Data Model]].

---

## Environment Variables

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string (Neon in prod) |

---

## Related

- [[Data Model]] — schema and models
- [[Architecture Overview]] — tech stack context
