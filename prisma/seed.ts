import prisma from '../src/config/prisma.js';
import { cleanupExpired } from '../src/services/demo.js';
await cleanupExpired();
console.log('Database ready. Explore demo creates fresh synthetic records in an isolated workspace.');
await prisma.$disconnect();
