import express from 'express';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { config } from './config/env.js';
import prisma from './config/prisma.js';
import authRoutes from './routes/auth.routes.js';
import userRoutes from './routes/user.routes.js';
import recordRoutes from './routes/record.routes.js';
import dashboardRoutes from './routes/dashboard.routes.js';
import { errorHandler, HttpError } from './middleware/errorHandler.js';

const app = express();
app.disable('x-powered-by');
if (config.trustProxy) app.set('trust proxy', config.trustProxy);
app.set('json replacer', (_key: string, value: unknown) => typeof value === 'bigint' ? value.toString() : value);
app.use(helmet({ contentSecurityPolicy: { directives: {
  defaultSrc: ["'self'"], scriptSrc: ["'self'"], styleSrc: ["'self'", "'unsafe-inline'"],
  imgSrc: ["'self'", 'data:'], fontSrc: ["'self'"], connectSrc: ["'self'"],
  frameAncestors: ["'none'"], objectSrc: ["'none'"], upgradeInsecureRequests: config.production ? [] : null,
} }, strictTransportSecurity: config.production ? undefined : false, referrerPolicy: { policy: 'no-referrer' } }));
app.use('/api', (_req, res, next) => { res.set('Cache-Control', 'no-store'); next(); });
app.use('/api', rateLimit({ windowMs: 60000, limit: 300, standardHeaders: 'draft-8', legacyHeaders: false, message: { error: 'Too many requests. Try again in a minute.' } }));
app.use('/api', (req, _res, next) => {
  if (!['GET','HEAD','OPTIONS'].includes(req.method) && req.get('origin') !== config.origin) throw new HttpError(403, 'Request origin is not allowed.');
  next();
});
app.use(express.json({ limit: '32kb' }));
app.use('/api/auth', authRoutes);
app.use('/api/team', userRoutes);
app.use('/api/records', recordRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.get('/health', async (_req, res) => {
  try { await prisma.$queryRaw`SELECT 1`; res.json({ status: 'ok' }); }
  catch { res.status(503).json({ status: 'unavailable' }); }
});
app.use('/api', (_req, res) => { res.status(404).json({ error: 'Not found.' }); });
const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
app.use(express.static(resolve(root, 'public'), { maxAge: config.production ? '1h' : 0, setHeaders: (res, file) => { if (file.endsWith('.html')) res.setHeader('Cache-Control','no-cache'); } }));
app.use((_req, res) => { res.status(404).type('text').send('Page not found. Return to /'); });
app.use(errorHandler);
export default app;
