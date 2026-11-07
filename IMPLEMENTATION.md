# Finance Workspace completion plan

## Confirmed scope

- Dedicated working copy; original Desktop, Downloads, and `.gemini` projects are reference-only.
- Both a public demonstration and isolated workspaces for real teams.
- INR is the initial workspace and demo currency.
- The user approved the refined previews; the connected app uses the Mercury/Stripe workbench with light and dark themes.

## Current state

- [x] Copy the source without its database, environment secrets, or dependencies.
- [x] Audit the existing authentication, record, user, and reporting flows.
- [x] Record product requirements in `PRODUCT.md`.
- [x] Build two interactive design previews using synthetic data.
- [x] Adopt Finance Workspace as the temporary name pending a distinct public brand.
- [x] Review both previews at desktop and mobile sizes; fix mobile totals, demo labels, and chart transitions.
- [x] Replace static comparison thumbnails with continuous data-bound chart focus and automatic period/category insights.
- [x] Revise both previews against product references: compact ledger layout, horizontal dark-layout navigation, neutral surfaces, and self-hosted Geist typography. Verify 320–1440px layouts, themes, record arithmetic, CSV export, navigation, continuous guidance, and reduced motion.
- [x] Obtain visual approval and connect the approved workbench to the API.
- [ ] Verify/resume the optional design-tool update interrupted by the server restart.

## Completed application work

- [x] Workspace memberships and scoped record/report queries, plus switching between accessible workspaces.
- [x] Per-visitor synthetic demos with 24-hour expiry and scheduled cleanup.
- [x] BigInt minor-unit storage, exact decimal parsing, and string-encoded monetary API fields.
- [x] HttpOnly opaque sessions validated against current database membership on every request.
- [x] Validated identifiers, calendar dates, pagination, search, amounts, and request origin.
- [x] Transactional last-administrator protection, including concurrent role changes.
- [x] Create/edit/soft-delete/restore, version conflicts, filters/sort, pagination, and authorized CSV exports.
- [x] Summaries, category totals, and zero-filled daily/monthly series.
- [x] Team invitations, membership roles/status, profile/password and workspace settings.
- [x] Connected responsive UI, continuous chart guidance, and loading/empty/error/focus/reduced-motion states.

## Verification and delivery

- API integration tests: workspace isolation, role enforcement, session behavior, monetary totals, record lifecycle, and validation failures.
- Browser checks: authentication, record creation/editing/deletion, report updates, team access, keyboard operation, and mobile flows.
- Bounded desktop/mobile visual review of the selected implementation.
- Repeatable database setup/migrations and explicitly synthetic demo seeding.
- Production build, CI configuration, deployment instructions, and persistent-storage configuration.
- Confirm hosting provider and required deployment credentials before claiming a public deployment.
- Record the built visual system in `DESIGN.md` at completion.

## Verified delivery

- Seven HTTP integration scenarios pass against a temporary SQLite database.
- Five end-to-end browser scenarios pass against the production build and a separate database.
- TypeScript compilation and dependency audit pass.
- Docker, persistent-volume, migration, health-check, and GitHub Actions configurations are included.
- Public hosting remains a deployment step; no hosting account or production URL has been selected.

## Historical source findings

The copied prototype used JWT-embedded roles, floating-point amounts, a shared database scope, and had no tests. The connected application replaces those behaviors with current-membership session checks, integer minor units, workspace isolation, and HTTP/browser coverage. Original source folders were not modified.
