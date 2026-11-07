# Architecture

## Request path

The Express application serves the static frontend and JSON API from one origin. `src/app.ts` exports the application without opening a port; `src/index.ts` owns startup, cleanup, and graceful shutdown. Tests use the same app with real HTTP requests and a disposable database.

The stack retains the original project's Express/TypeScript/Prisma structure. The frontend is build-free ES modules: `app.js` owns navigation, forms and data loading; `lib.js` handles HTTP, escaping and exact money formatting; `charts.js` renders SVG; `live-charts.js` manages continuous data-bound focus.

## Data boundaries

Users are global accounts; memberships connect them to workspaces. A session stores its selected workspace and the hash of a random token. Authentication checks session expiry, workspace expiry, and active membership, then reads the current role. Record/report queries always include that workspace ID.

Administrative mutations acquire a SQLite transaction write lock before rechecking the acting member. Last-admin counting and membership updates occur inside the same transaction. Record edits carry version numbers, so a stale browser cannot silently overwrite a newer edit.

## Money and time

SQLite stores `amountMinor` as a 64-bit integer via Prisma `BigInt`. Input amounts are decimal strings parsed without floating-point multiplication. HTTP monetary fields are decimal strings in minor units. Exact UI amounts use `BigInt`; normalized chart geometry and compact visual labels use Number projections. Hover titles retain exact values.

Records store UTC calendar dates as ISO date strings. Reports use inclusive ranges and emit zero-filled day/month buckets. “Net recorded balance” means income minus expenses in the selected range, not a bank account balance.

## Demo lifecycle

Every demo request creates a new synthetic user, workspace, membership, and 48 records relative to the current month. Public visitors never share a mutable demo ledger. Demos expire in 24 hours, are rejected immediately after expiry, and are removed by startup/hourly cleanup. Cleanup also removes orphaned demo users, expired sessions, and expired invitation links.

## UI state and motion

Routes and mutations fetch authorized data from the server. AbortController and load sequence IDs prevent older requests from replacing newer view data. Authentication failures lead back to sign-in; forms retain inputs when writes fail. Menus and record-entry panels use semantic navigation and dialogs.

Charts leave the full data geometry visible while moving a period spotlight and cycling category explanations. Pausing, opening a modal, hidden tabs, and reduced-motion preferences stop the guide. Resize observers are disconnected when views are replaced. No simulated payments or random balance updates are used.

## Operational limits

The supported deployment is one process with local persistent SQLite and an HTTPS reverse proxy. Rate limiting is per-process. The product records finances; it does not move money, connect banks, send emails, perform accounting reconciliation, or implement tax calculations. Deployment details and recovery boundaries are in `DEPLOYMENT.md`.
