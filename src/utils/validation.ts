import { z } from 'zod';
import type { Prisma } from '@prisma/client';
export const today = () => new Date().toISOString().slice(0, 10);
export const nameSchema = z.string().trim().min(2, 'Use at least 2 characters.').max(80);
export const emailSchema = z.email().trim().toLowerCase().max(254);
export const passwordSchema = z.string().min(12, 'Use at least 12 characters for your password.').refine(v => Buffer.byteLength(v, 'utf8') <= 72, 'Password must be at most 72 UTF-8 bytes.');
export const idSchema = z.uuid();
export const roleSchema = z.enum(['ADMIN', 'ANALYST', 'VIEWER']);
export const dateSchema = z.iso.date().refine(v => v >= '1900-01-01' && v <= today(), 'Choose a valid date up to today.');
export const amountSchema = z.string().regex(/^\d{1,9}(\.\d{1,2})?$/, 'Enter an amount with at most two decimal places.').transform(v => {
  const [whole = '0', fraction = ''] = v.split('.');
  return BigInt(whole) * 100n + BigInt(fraction.padEnd(2, '0'));
}).refine(v => v > 0n, 'Amount must be greater than zero.');
export const recordSchema = z.object({ amount: amountSchema, type: z.enum(['INCOME', 'EXPENSE']), category: z.string().trim().min(1).max(50), description: z.string().trim().min(1).max(200), date: dateSchema }).strict();
export const versionSchema = z.number().int().positive();
const integerQuery = (fallback: number, max: number) => z.string().regex(/^\d+$/).transform(Number).pipe(z.number().int().min(1).max(max)).default(fallback);
export const filterSchema = z.object({
  start: dateSchema.optional(), end: dateSchema.optional(),
  query: z.string().trim().max(100).default(''), category: z.string().trim().max(50).optional(),
  type: z.enum(['INCOME', 'EXPENSE']).optional(),
  page: integerQuery(1, 100000), limit: integerQuery(20, 100),
  sort: z.enum(['date-desc', 'date-asc', 'amount-desc', 'amount-asc']).default('date-desc'),
  deleted: z.enum(['true', 'false']).default('false'),
}).strict().superRefine((v, ctx) => {
  if (v.start && v.end && v.start > v.end) ctx.addIssue({ code: 'custom', message: 'Start date must come before end date.' });
});
export type Filters = z.infer<typeof filterSchema>;
export function recordWhere(workspaceId: string, f: Filters): Prisma.FinancialRecordWhereInput {
  return { workspaceId, deletedAt: f.deleted === 'true' ? { not: null } : null,
    ...(f.type ? { type: f.type } : {}), ...(f.category ? { category: f.category } : {}),
    ...(f.start || f.end ? { date: { gte: f.start, lte: f.end } } : {}),
    ...(f.query ? { OR: [{ description: { contains: f.query } }, { category: { contains: f.query } }] } : {}) };
}
export function decimal(minor: bigint) { return `${minor / 100n}.${(minor % 100n).toString().padStart(2, '0')}`; }
export const csvCell = (value: unknown) => {
  const s = String(value);
  return '"' + (/^[\s]*[=+\-@\t\r]/.test(s) ? "'" : '') + s.replaceAll('"', '""') + '"';
};
