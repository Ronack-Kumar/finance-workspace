import { Router } from 'express';
import { z } from 'zod';
import prisma from '../config/prisma.js';
import { authenticate, authorize, identity } from '../middleware/auth.js';
import { HttpError } from '../middleware/errorHandler.js';
import { dateSchema, today, csvCell, decimal } from '../utils/validation.js';
const router = Router();
router.use(authenticate);
const rangeSchema = z.object({ start: dateSchema, end: dateSchema }).strict();
async function report(workspaceId: string, query: unknown) {
  const { start, end } = rangeSchema.parse(query);
  const days = (Date.parse(end)-Date.parse(start))/86400000;
  if (days < 0 || days > 731) throw new HttpError(400, 'Choose an ordered date range of at most two years.');
  const where = { workspaceId, deletedAt: null, date: { gte: start, lte: end } };
  const [daily, categoryTotals] = await prisma.$transaction([
    prisma.financialRecord.groupBy({ by: ['date','type'], where, _sum: { amountMinor: true }, _count: { id: true } }),
    prisma.financialRecord.groupBy({ by: ['category'], where: { ...where, type: 'EXPENSE' }, _sum: { amountMinor: true }, orderBy: { _sum: { amountMinor: 'desc' } } }),
  ]);
  const series = new Map<string, { key: string; label: string; income: bigint; expense: bigint }>();
  const monthly = days > 31;
  const cursor = new Date(start+'T00:00:00Z');
  if (monthly) cursor.setUTCDate(1);
  while (cursor.toISOString().slice(0,10) <= end) {
    const key = cursor.toISOString().slice(0, monthly ? 7 : 10);
    const label = cursor.toLocaleDateString('en-IN', { timeZone: 'UTC', month: 'short', ...(monthly ? { year: '2-digit' as const } : { day: 'numeric' as const }) });
    series.set(key, { key, label, income: 0n, expense: 0n });
    if (monthly) cursor.setUTCMonth(cursor.getUTCMonth()+1); else cursor.setUTCDate(cursor.getUTCDate()+1);
  }
  let income = 0n, expense = 0n, incomeCount = 0, expenseCount = 0;
  for (const row of daily) {
    const value = row._sum.amountMinor ?? 0n;
    const bucket = series.get(row.date.slice(0, monthly ? 7 : 10))!;
    if (row.type === 'INCOME') { income += value; incomeCount += row._count.id; bucket.income += value; }
    else { expense += value; expenseCount += row._count.id; bucket.expense += value; }
  }
  return { start, end, generatedAt: new Date().toISOString(), today: today(),
    totals: { income, expense, balance: income-expense, incomeCount, expenseCount, count: incomeCount+expenseCount },
    series: [...series.values()], categories: categoryTotals.map(c => ({ name: c.category, total: c._sum.amountMinor ?? 0n })) };
}
router.get('/', async (req, res) => { res.json(await report(identity(req).workspace.id, req.query)); });
router.get('/export', async (req, res) => {
  const result = await report(identity(req).workspace.id, req.query);
  const signedDecimal = (v: bigint) => v < 0n ? '-'+decimal(-v) : decimal(v);
  const rows = [['Period','Income (INR)','Expenses (INR)','Net (INR)'], ...result.series.map(r => [r.key,decimal(r.income),decimal(r.expense),signedDecimal(r.income-r.expense)])];
  res.attachment('finance-report.csv').type('text/csv').send('\ufeff'+rows.map(r => r.map(csvCell).join(',')).join('\r\n'));
});
router.get('/activity', authorize('ADMIN', 'ANALYST'), async (req, res) => {
  res.json(await prisma.auditEvent.findMany({ where: { workspaceId: identity(req).workspace.id }, orderBy: { createdAt: 'desc' }, take: 30 }));
});
export default router;
