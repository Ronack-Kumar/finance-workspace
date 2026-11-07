// Prisma 7 config — provides datasource URL to the CLI
import 'dotenv/config';
import { defineConfig } from 'prisma/config';
import { resolve } from 'node:path';

const databaseUrl = process.env['DATABASE_URL'] ?? 'file:./dev.db';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: { path: 'prisma/migrations' },
  datasource: {
    url: databaseUrl.startsWith('file:') ? `file:${resolve(databaseUrl.slice(5))}` : databaseUrl,
  },
});
