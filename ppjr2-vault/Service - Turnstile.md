# Service — Turnstile (CAPTCHA)

Part of [[Architecture Overview]] → [[Public Submission Flow]].

**Source:** [lib/turnstile.ts](lib/turnstile.ts)

---

## Responsibilities

Server-side verification of Cloudflare Turnstile tokens. Protects the public payment submission form from bot spam.

---

## How It Works

1. The `TurnstileWidget` component (`app/(public)/submit/turnstile-widget.tsx`) renders the Cloudflare widget in the browser.
2. On form submit, the browser appends `cf-turnstile-response` to the `FormData`.
3. [[Service - Public Submissions]] extracts the token and calls `verifyTurnstile(token)`.
4. `verifyTurnstile` POSTs the token to the Cloudflare verification API.
5. Returns `true` if Cloudflare confirms the token is valid, `false` otherwise.

---

## Environment Variables

| Variable | Purpose |
|---|---|
| `TURNSTILE_SECRET_KEY` | Cloudflare secret key for server-side verification |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | Public site key used by the browser widget |

---

## Related

- [[Service - Public Submissions]] — only consumer
- [[Public Submission Flow]] — context for why this exists
