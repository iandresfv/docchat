# ADR-0009 — Auth: access JWT plus a rotating refresh cookie, argon2 passwords

- **Status:** Accepted
- **Date:** 2026-10-11

## Context

Verified: the FastAPI documentation now uses PyJWT with `pwdlib[argon2]`; python-jose is stale
and carries CVEs; fastapi-users is in maintenance mode; RFC 9700 requires rotating or
sender-constrained refresh tokens for public clients.

## Decision

Hand-rolled, roughly 150 lines:

- **Access token** — JWT, HS256, 15 minutes, claims `sub`, `exp`, `iat`, `jti`. Returned in the
  response body and held in memory by the SPA.
- **Refresh token** — opaque 256-bit value, stored sha256-hashed in `refresh_tokens`, 7 days, in
  an `HttpOnly; Secure; SameSite=Lax; Path=/api/v1/auth` cookie. Rotated on every refresh;
  reuse of a consumed token revokes the whole family.
- **Passwords** — argon2id through `pwdlib`.
- Sign-in errors are generic; auth endpoints are rate-limited per IP.

SSE works with a Bearer header because the client uses `fetch`, not `EventSource`.

## Rejected

A server-side session cookie (simplest, but a CSRF surface on every mutation and no stateless
story), fastapi-users (maintenance mode, dictates the models), and OAuth providers (turns this
into an identity project — noted for v1.x).

## Reversal

The `current_user` dependency is the only consumer of the token format.
