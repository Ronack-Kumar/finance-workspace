import { Router } from 'express';
import { z } from 'zod';
import type { Prisma } from '@prisma/client';
import prisma from '../config/prisma.js';
import { authenticate, authorize, identity, lockAdmin } from '../middleware/auth.js';
import { HttpError } from '../middleware/errorHandler.js';
import { recordSchema, filterSchema, recordWhere, versionSchema, idSchema, decimal, csvCell } from '../utils/validation.js';
const router = Router();
router.use(authenticate, authorize('ADMIN', 'ANALYST'));
function filters(req: Parameters<typeof identity>[0]) {
  const f = filterSchema.parse(req.query);
  if (f.deleted === 'true' && identity(req).role !== 'ADMIN') throw new HttpError(403, 'Only administrators can view deleted records.');
  return f;
}
router.get('/', async (req, res) => {
  const f = filters(req), where = recordWhere(identity(req).workspace.id, f);
  const [field, direction] = f.sort.split('-');
  const orderBy: Prisma.FinancialRecordOrderByWithRelationInput[] = [{ [field === 'amount' ? 'amountMinor' : 'date']: direction }, { id: 'asc' }];
  const [data, total] = await prisma.$transaction([
    prisma.financialRecord.findMany({ where, orderBy, skip: (f.page-1)*f.limit, take: f.limit }),
    prisma.financialRecord.count({ where }),
  ]);
  res.json({ data, total, page: f.page, totalPages: Math.ceil(total/f.limit) });
});
router.get('/export', async (req, res) => {
  const f = filters(req), where = recordWhere(identity(req).workspace.id, f);
  const rows = await prisma.financialRecord.findMany({ where, orderBy: [{ date: 'desc' }, { id: 'asc' }], take: 10001 });
  if (rows.length > 10000) throw new HttpError(400, 'Choose a smaller date range to export at most 10,000 records.');
  const csv = [['Date','Description','Category','Type','Amount (INR)'], ...rows.map(r => [r.date,r.description,r.category,r.type,decimal(r.amountMinor)])].map(r => r.map(csvCell).join(',')).join('\r\n');
  res.attachment('finance-transactions.csv').type('text/csv').send('\ufeff'+csv);
});
router.post('/', authorize('ADMIN'), async (req, res) => {
  const { amount, ...input } = recordSchema.parse(req.body);
  const record = await prisma.$transaction(async tx => {
    const current = await lockAdmin(tx, req);
    const record = await tx.financialRecord.create({ data: { ...input, amountMinor: amount, workspaceId: current.workspace.id } });
    await tx.auditEvent.create({ data: { workspaceId: current.workspace.id, actor: current.user.name, action: 'Transaction added', detail: record.description } });
    return record;
  });
  res.status(201).json(record);
});
router.get('/:id', async (req, res) => {
  const id = idSchema.parse(req.params['id']);
  const record = await prisma.financialRecord.findFirst({ where: { id, workspaceId: identity(req).workspace.id, deletedAt: null } });
  if (!record) throw new HttpError(404, 'Transaction not found.');
  res.json(record);
});
router.patch('/:id', authorize('ADMIN'), async (req, res) => {
  const id = idSchema.parse(req.params['id']);
  const { amount, version, ...input } = recordSchema.extend({ version: versionSchema }).parse(req.body);
  const record = await prisma.$transaction(async tx => {
    const current = await lockAdmin(tx, req);
    const existing = await tx.financialRecord.findFirst({ where: { id, workspaceId: current.workspace.id, deletedAt: null } });
    if (!existing) throw new HttpError(404, 'Transaction not found.');
    if (existing.version !== version) throw new HttpError(409, 'This record changed. Close the panel and refresh before editing.');
    const result = await tx.financialRecord.update({ where: { id }, data: { ...input, amountMinor: amount, version: { increment: 1 } } });
    await tx.auditEvent.create({ data: { workspaceId: current.workspace.id, actor: current.user.name, action: 'Transaction updated', detail: result.description } });
    return result;
  });
  res.json(record);
});
router.delete('/:id', authorize('ADMIN'), async (req, res) => {
  const id = idSchema.parse(req.params['id']);
  const { version } = z.object({ version: versionSchema }).strict().parse(req.body);
  await prisma.$transaction(async tx => {
    const current = await lockAdmin(tx, req);
    const record = await tx.financialRecord.findFirst({ where: { id, workspaceId: current.workspace.id, deletedAt: null } });
    if (!record) throw new HttpError(404, 'Transaction not found.');
    if (record.version !== version) throw new HttpError(409, 'This record changed. Refresh before deleting.');
    await tx.financialRecord.update({ where: { id }, data: { deletedAt: new Date(), version: { increment: 1 } } });
    await tx.auditEvent.create({ data: { workspaceId: current.workspace.id, actor: current.user.name, action: 'Transaction deleted', detail: record.description } });
  });
  res.status(204).end();
});
router.post('/:id/restore', authorize('ADMIN'), async (req, res) => {
  const id = idSchema.parse(req.params['id']);
  await prisma.$transaction(async tx => {
    const current = await lockAdmin(tx, req);
    const result = await tx.financialRecord.updateMany({ where: { id, workspaceId: current.workspace.id, deletedAt: { not: null } }, data: { deletedAt: null, version: { increment: 1 } } });
    if (!result.count) throw new HttpError(404, 'Deleted transaction not found.');
    await tx.auditEvent.create({ data: { workspaceId: current.workspace.id, actor: current.user.name, action: 'Transaction restored', detail: 'Restored from deleted records.' } });
  });
  res.json({ message: 'Transaction restored.' });
});
export default router;
