# HTTP API

All routes are same-origin under `/api`. JSON responses use `Cache-Control: no-store`. Errors are `{ "error": "Human-readable message" }`, optionally with validation `details`.

## Authentication and request rules

- Sessions use an HttpOnly, SameSite=Lax cookie. Production adds Secure and the `__Host-` prefix.
- Mutating requests require an `Origin` header exactly equal to configured `APP_ORIGIN`. Use `Content-Type: application/json` for JSON bodies. The browser supplies Origin automatically.
- Permissions and workspace membership are checked from the database on each authenticated request. Never supply a workspace identifier to a record/report route: scope comes from the session.
- JSON bodies are limited to 32 KB. Authentication/demo creation and the API have IP-based rate limits; 429 responses include retry information.

## Accounts

| Method and path | Body / behavior |
| --- | --- |
| `POST /auth/register` | `{name,email,password,workspace}` creates an account and workspace. Replace `workspace` with `invitation` to join via a token. |
| `POST /auth/login` | `{email,password}`; creates a new session. |
| `POST /auth/logout` | Revokes this session, clears cookie, returns 204. |
| `POST /auth/demo` | Creates a private, 24-hour synthetic workspace. |
| `GET /auth/me` | Current `user`, `workspace`, `role`, and accessible `workspaces`. |
| `POST /auth/switch` | `{workspaceId}` selects an active membership. |
| `PATCH /auth/profile` | `{name}` changes the current user's name. |
| `POST /auth/password` | `{currentPassword,newPassword}`; revokes other sessions. |

Passwords require 12 characters and at most 72 UTF-8 bytes. Email addresses are normalized to lowercase. Names are 2–80 characters.

## Records — Admin and Analyst

`GET /records` returns `{data,total,page,totalPages}`. Supported query parameters:

| Parameter | Values |
| --- | --- |
| `start`, `end` | Inclusive `YYYY-MM-DD` dates, optional. |
| `query` | Description/category text, up to 100 characters. |
| `category` | Exact category match. |
| `type` | `INCOME` or `EXPENSE`. |
| `page`, `limit` | Positive integers; default page 1, limit 20; maximum limit 100. |
| `sort` | `date-desc` (default), `date-asc`, `amount-desc`, `amount-asc`. |
| `deleted` | `true` to inspect deleted records (Admin only); otherwise active records. |

- `GET /records/:id`: one active record in this workspace.
- `GET /records/export`: filtered CSV, up to 10,000 records. Narrow the range for larger datasets. Text is escaped to avoid spreadsheet-formula interpretation.
- `POST /records` (Admin): create a record.
- `PATCH /records/:id` (Admin): replace editable fields with a required current `version`.
- `DELETE /records/:id` (Admin): body `{version}`; soft-delete, 204 response.
- `POST /records/:id/restore` (Admin): restore a deleted record.

Write example:

```json
{
  "amount": "1250.50",
  "type": "INCOME",
  "category": "Consulting",
  "description": "Client retainer",
  "date": "2026-11-07"
}
```

Dates must be real calendar dates between 1900-01-01 and today (UTC). Amounts must be positive decimal **strings**, with up to nine whole-number digits and two decimal places. Responses include `amountMinor: "125050"` in paise. Record/report monetary fields are string-encoded integers to retain precision. Stale versions return 409; cross-workspace identifiers return 404.

## Reports — all roles

- `GET /dashboard?start=YYYY-MM-DD&end=YYYY-MM-DD`: `totals`, `series`, `categories`, range, and generation time. The range is required, inclusive, and at most two years.
- `GET /dashboard/export` with the same range: report CSV.
- `GET /dashboard/activity` (Admin/Analyst): latest 30 workspace audit events.

Totals include `income`, `expense`, `balance`, `count`, `incomeCount`, `expenseCount`. Series use days for ranges up to 31 days, otherwise calendar months, and include zero-activity periods. Income/expense strings use minor units. Category totals include expenses only. Viewers never receive individual records or audit entries through these routes.

## Team

- `GET /team` (Admin): members and pending invitations. No token hashes or password hashes are returned.
- `POST /team/invite` (Admin): `{email,role}` returns a one-time `url` and expiry. Disabled in demos.
- `DELETE /team/invite/:id` (Admin): revoke an invitation.
- `PATCH /team/:membershipId` (Admin): `{role?,isActive?}`; at least one active admin must remain.
- `PATCH /team/workspace/settings` (Admin): `{name}`.
- `GET /team/invitation/:token` (public): invited email, role, and workspace name. Only valid, unused tokens work.
- `POST /team/accept` (authenticated): `{token}` joins the matching invited email's workspace and selects it. Used/expired tokens cannot be replayed.

Standard statuses: 400 invalid input, 401 no valid session, 403 insufficient permissions/origin rejected, 404 not found, 409 conflict, 429 rate limit, 500 unexpected failure.
