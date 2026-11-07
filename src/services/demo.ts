import prisma from '../config/prisma.js';
import { randomUUID } from 'node:crypto';
export async function cleanupExpired() {
  const now = new Date();
  await prisma.session.deleteMany({ where: { expiresAt: { lte: now } } });
  await prisma.workspace.deleteMany({ where: { isDemo: true, expiresAt: { lte: now } } });
  await prisma.user.deleteMany({ where: { isDemo: true, memberships: { none: {} } } });
  await prisma.invitation.deleteMany({ where: { expiresAt: { lte: now } } });
}
export async function createDemo() {
  const now = new Date();
  return prisma.$transaction(async tx => {
    const workspace = await tx.workspace.create({ data: { name: 'Demo studio', isDemo: true, expiresAt: new Date(Date.now() + 86400000) } });
    const user = await tx.user.create({ data: { name: 'Demo visitor', email: `${randomUUID()}@demo.invalid`, isDemo: true,
      memberships: { create: { workspaceId: workspace.id, role: 'ADMIN' } } } });
    const records = [];
    for (let i = 0; i < 6; i++) {
      const month = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 5 + i, 1)).toISOString().slice(0, 7);
      const entries = [
        ['Client retainer', 'Consulting', 'INCOME', [142000,168000,154000,189000,212000,226000][i]!, 5],
        ['Website project', 'Projects', 'INCOME', [27000,34000,30000,38000,45000,51000][i]!, 2],
        ['Team payroll', 'Payroll', 'EXPENSE', 42000+i*2000, 6], ['Studio rent', 'Rent', 'EXPENSE', 27000, 1],
        ['Design software', 'Software', 'EXPENSE', 3100+i*80, 4], ['Cloud hosting', 'Hosting', 'EXPENSE', 2600+i*320, 3],
        ['Campaign spend', 'Marketing', 'EXPENSE', 8500+i*750, 4], ['Client travel', 'Travel', 'EXPENSE', 3800+i*550, 2],
      ] as const;
      for (const [description, category, type, amount, day] of entries) {
        const date = `${month}-${String(i === 5 ? Math.min(day, now.getUTCDate()) : day).padStart(2, '0')}`;
        records.push({ workspaceId: workspace.id, description, category, type, amountMinor: BigInt(amount) * 100n, date });
      }
    }
    await tx.financialRecord.createMany({ data: records });
    return { user, workspace };
  });
}
