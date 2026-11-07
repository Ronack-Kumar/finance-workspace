# Deployment and operations

## Supported topology

One application process/container with a persistent local SQLite volume, behind an HTTPS reverse proxy. This is a small-team deployment. The in-memory rate limiter and local SQLite file are not a horizontally distributed setup. Do not mount the same SQLite database over a network filesystem or launch independent replicas against separate files.

## Environment

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | Local SQLite URL. Development: `file:./dev.db`. Docker: `file:/app/data/finance.db`. |
| `APP_ORIGIN` | Exact browser origin, with no path or trailing slash. Required HTTPS in production. |
| `PORT` | Listening port, default 3000. |
| `HOST` | Listening address, default `0.0.0.0`. |
| `NODE_ENV` | Set to `production` for Secure cookies, HTTPS origin enforcement, and HSTS. |
| `TRUST_PROXY_HOPS` | Exact number of trusted proxy hops. Default 0; supplied Compose example assumes one. |

No JWT secret is needed: sessions use random opaque tokens, with only their SHA-256 hashes stored in the database. HTTPS is required in production because cookies use `Secure` and the `__Host-` prefix.

## Docker Compose

1. Set a real origin and proxy hop count in the host environment (or deployment `.env`).
2. Build and start the application.
3. Route that HTTPS origin through your reverse proxy to `127.0.0.1:3000`.

```sh
export APP_ORIGIN=https://finance.example.com
export TRUST_PROXY_HOPS=1
docker compose up -d --build
docker compose logs -f finance
```

PowerShell equivalents use `$env:APP_ORIGIN='https://finance.example.com'` and `$env:TRUST_PROXY_HOPS='1'`.

The named `finance-data` volume retains the database between container replacements. Container startup runs `prisma migrate deploy` before starting Node. Do not use `docker compose down -v` on a workspace you intend to keep.

`GET /health` runs a database query and returns 200 with `{"status":"ok"}`, or 503 if unavailable. Configure the hosting provider's health check to use this endpoint. Monitor server error logs and disk space; application logs do not intentionally record passwords, cookies, or invitation tokens.

## Without Docker

Use Node 24 LTS. Set environment variables, then run:

```sh
npm ci
npm run build
npm run db:setup
npm prune --omit=dev
npm start
```

Run under a process supervisor with a persistent working directory. Resolve relative `file:` database paths from that directory. Prisma CLI is retained as a runtime dependency for migrations.

## Backups and restore

For the supported single-process deployment, use a brief maintenance window:

1. Stop the finance container/process.
2. Copy the **entire data directory/volume** to a dated, access-controlled backup. Include SQLite sidecar files if present.
3. Start the service and check `/health`.
4. Regularly test restoring a copy into a separate installation.

Restore with the application stopped, preserve directory ownership (container user `node`), and start a version compatible with the backup's schema. Before upgrading, take a backup and review migrations. Do not run destructive development migration resets against production.

## Retention and account recovery

- Demo workspaces expire after 24 hours. Access ends at expiry; startup/hourly cleanup removes expired demos and orphaned demo users.
- Sessions last seven days (one day for demos). Logout revokes the current token; password changes revoke other sessions.
- Expired invitations and sessions are removed during cleanup.
- Deleted financial records remain recoverable by administrators; this is soft deletion, not a data-erasure feature.
- Automated email delivery, email verification, password-reset emails, and billing are not included. Users can change their password from Settings while signed in. Establish an operator-assisted recovery process before opening a deployment to users who need unattended recovery.

## Release check

Run `npm run check` and `npm run test:e2e`, review CI, back up the volume, then rebuild/restart. Confirm sign-in, a workspace report, and `/health` after the release. Keep the previous image and matching backup available for rollback.
