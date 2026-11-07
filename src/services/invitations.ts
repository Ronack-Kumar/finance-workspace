import type { Prisma } from '@prisma/client';
import { hashToken } from '../middleware/auth.js';
import { HttpError } from '../middleware/errorHandler.js';
export async function claimInvitation(tx: Prisma.TransactionClient, token: string, userId: string, email: string) {
  const invitation = await tx.invitation.findUnique({ where: { tokenHash: hashToken(token) } });
  if (!invitation || invitation.email !== email || invitation.usedAt || invitation.expiresAt <= new Date()) {
    throw new HttpError(400, 'This invitation is invalid, expired, or belongs to a different email.');
  }
  const claimed = await tx.invitation.updateMany({ where: { id: invitation.id, usedAt: null, expiresAt: { gt: new Date() } }, data: { usedAt: new Date() } });
  if (!claimed.count) throw new HttpError(409, 'This invitation has already been used.');
  await tx.membership.create({ data: { userId, workspaceId: invitation.workspaceId, role: invitation.role } });
  return invitation.workspaceId;
}
