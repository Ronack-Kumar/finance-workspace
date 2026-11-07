import 'dotenv/config';
const production = process.env['NODE_ENV'] === 'production';
const origin = process.env['APP_ORIGIN'] ?? 'http://localhost:3000';
if (production && (!process.env['APP_ORIGIN'] || !origin.startsWith('https://'))) {
  throw new Error('Production requires an HTTPS APP_ORIGIN.');
}
if (new URL(origin).origin !== origin) throw new Error('APP_ORIGIN must be an origin without a trailing slash.');
export const config = {
  production, origin,
  port: Number(process.env['PORT'] ?? 3000),
  host: process.env['HOST'] ?? '0.0.0.0',
  trustProxy: Number(process.env['TRUST_PROXY_HOPS'] ?? 0),
  sessionCookie: production ? '__Host-finance_session' : 'finance_session',
};
