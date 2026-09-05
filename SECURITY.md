# Security policy

## Scope

Kirina Korean is a single-user, local-first learning application. Progress, SRS cards, drafts, and portfolio entries stay in the browser; recording blobs stay in same-origin IndexedDB. The application currently has no accounts, server API, cookies, tokens, or cross-user data boundary.

Because of that design, a user editing their own `localStorage` is a product-integrity limitation, not an authorization bypass. Do not use browser-stored progress as a trusted certificate, entitlement, leaderboard score, or other server-side fact. A future synchronized service must add identity, server-side validation, and tamper-evident events before making those claims.

## Supported runtime

- Node.js `>=20.9.0`
- Production dependency checks: `npm run audit:prod`
- CI checks: `npm run validate`, `npm run lint`, `npm run typecheck`, `npm test`, and `npm run build`

The preview server listens on loopback by default. If `HOST=0.0.0.0` is used, place it behind TLS, a reverse proxy, and access controls.

## Reporting

Please report a suspected security issue privately to the repository owner rather than publishing exploit details in an issue. Include the affected commit, exact reproduction steps, expected impact, and whether the issue requires an intentionally imported local backup or developer-only script input.

The 2026-09-01 repository audit found no confirmed remotely exploitable runtime vulnerability. Its local working papers are generated under `security-audit-results/run-2/`; production dependency audit is currently clean (`npm audit --omit=dev`).
