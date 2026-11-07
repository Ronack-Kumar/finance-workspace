import { Router } from 'express';
import { z } from 'zod';
import prisma from '../config/prisma.js';
import { config } from '../config/env.js';
import { authenticate, authorize, identity, lockAdmin, hashToken, newToken } from '../middleware/auth.js';
import { HttpError } from '../middleware/errorHandler.js';
import { emailSchema, roleSchema, idSchema, nameSchema } from '../utils/validation.js';
import { claimInvitation } from '../services/invitations.js';
const router = Router();

router.get('/invitation/:token', async (req, res) => {
  const token = z.string().regex(/^[a-f0-9]{64}$/).parse(req.params['token']);
  const invite = await prisma.invitation.findUnique({ where: { tokenHash: hashToken(token) }, include: { workspace: true } });
  if (!invite || invite.usedAt || invite.expiresAt <= new Date()) throw new HttpError(404, 'This invitation has expired or has already been used.');
  res.json({ email: invite.email, role: invite.role, workspace: invite.workspace.name });
});
router.post('/accept', authenticate, async (req, res) => {
  const { token } = z.object({ token: z.string().regex(/^[a-f0-9]{64}$/) }).strict().parse(req.body);
  const current = identity(req);
  if (current.user.isDemo) throw new HttpError(403, 'Sign in with your real account to accept an invitation.');
  const workspaceId = await prisma.$transaction(tx => claimInvitation(tx, token, current.user.id, current.user.email));
  await prisma.session.update({ where: { id: current.sessionId }, data: { workspaceId } });
  res.json({ message: 'You have joined the workspace.' });
});
router.use(authenticate, authorize('ADMIN'));
router.get('/', async (req, res) => {
  const workspaceId = identity(req).workspace.id;
  const [members, invitations] = await Promise.all([
    prisma.membership.findMany({ where: { workspaceId }, include: { user: { select: { id: true, name: true, email: true } } }, orderBy: { createdAt: 'asc' } }),
    prisma.invitation.findMany({ where: { workspaceId, usedAt: null, expiresAt: { gt: new Date() } }, select: { id: true, email: true, role: true, expiresAt: true }, orderBy: { createdAt: 'desc' } }),
  ]);
  res.json({ members, invitations });
});
router.post('/invite', async (req, res) => {
  const { email, role } = z.object({ email: emailSchema, role: roleSchema }).strict().parse(req.body);
  const current = identity(req);
  if (current.workspace.isDemo) throw new HttpError(403, 'Create a real workspace to invite teammates.');
  const token = newToken();
  const invitation = await prisma.$transaction(async tx => {
    await lockAdmin(tx, req);
    if (await tx.membership.findFirst({ where: { workspaceId: current.workspace.id, user: { email } } })) throw new HttpError(409, 'This person already belongs to the workspace.');
    await tx.invitation.deleteMany({ where: { workspaceId: current.workspace.id, email, usedAt: null } });
    return tx.invitation.create({ data: { workspaceId: current.workspace.id, email, role, tokenHash: hashToken(token), expiresAt: new Date(Date.now() + 7*86400000) } });
  });
  res.status(201).json({ id: invitation.id, url: `${config.origin}/#join/${token}`, expiresAt: invitation.expiresAt });
});
router.delete('/invite/:id', async (req, res) => {
  const id = idSchema.parse(req.params['id']);
  await prisma.$transaction(async tx => { const current = await lockAdmin(tx, req); await tx.invitation.deleteMany({ where: { id, workspaceId: current.workspace.id } }); });
  res.status(204).end();
});
router.patch('/:id', async (req, res) => {
  const id = idSchema.parse(req.params['id']);
  const changes = z.object({ role: roleSchema.optional(), isActive: z.boolean().optional() }).strict().refine(v => Object.keys(v).length > 0, 'Choose a change.').parse(req.body);
  const result = await prisma.$transaction(async tx => {
    const current = await lockAdmin(tx, req);
    const member = await tx.membership.findFirst({ where: { id, workspaceId: current.workspace.id } });
    if (!member) throw new HttpError(404, 'Member not found.');
    if (member.role === 'ADMIN' && member.isActive && (changes.isActive === false || (changes.role && changes.role !== 'ADMIN'))) {
      const admins = await tx.membership.count({ where: { workspaceId: current.workspace.id, role: 'ADMIN', isActive: true } });
      if (admins <= 1) throw new HttpError(409, 'Keep at least one active administrator in the workspace.');
    }
    const updated = await tx.membership.update({ where: { id }, data: changes });
    await tx.auditEvent.create({ data: { workspaceId: current.workspace.id, actor: current.user.name, action: 'Member access updated', detail: `Role: ${updated.role}; ${updated.isActive ? 'active' : 'disabled'}` } });
    return updated;
  });
  res.json(result);
});
router.patch('/workspace/settings', async (req, res) => {
  const { name } = z.object({ name: nameSchema }).strict().parse(req.body);
  await prisma.$transaction(async tx => { const current = await lockAdmin(tx, req); await tx.workspace.update({ where: { id: current.workspace.id }, data: { name } }); });
  res.json({ message: 'Workspace saved.' });
});
export default router;
