import app from './app.js';
import prisma from './config/prisma.js';
import { config } from './config/env.js';
import { cleanupExpired } from './services/demo.js';
await prisma.$queryRaw`SELECT 1`;
await cleanupExpired();
const server = app.listen(config.port, config.host, () => console.log(`Finance Workspace: ${config.origin}`));
const cleanup = setInterval(() => cleanupExpired().catch(err => console.error('Cleanup failed:', err)), 3600000);
cleanup.unref();
for (const signal of ['SIGINT','SIGTERM'] as const) process.on(signal, () => {
  clearInterval(cleanup);
  server.close(() => { void prisma.$disconnect().then(() => process.exit(0)); });
  setTimeout(() => process.exit(1), 10000).unref();
});
