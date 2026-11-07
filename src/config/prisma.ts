import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaLibSql } from '@prisma/adapter-libsql';
import { resolve } from 'node:path';

// @libsql/client requires a full absolute file:// URL for local SQLite
const dbPath = process.env['DATABASE_URL'] ?? 'file:./dev.db';
const url = dbPath.startsWith('file:') ? `file:${resolve(dbPath.slice(5))}` : dbPath;

// PrismaLibSql accepts a config object {url, authToken?}, not a Client instance
const adapter = new PrismaLibSql({ url });

const prisma = new PrismaClient({ adapter });

export default prisma;
