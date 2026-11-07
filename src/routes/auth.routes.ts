import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { rateLimit } from 'express-rate-limit';
import prisma from '../config/prisma.js';
import { authenticate, identity, issueSession, clearSession, sessionId, me } from '../middleware/auth.js';
import { HttpError } from '../middleware/errorHandler.js';
import { nameSchema, emailSchema, passwordSchema, idSchema } from '../utils/validation.js';
import { createDemo } from '../services/demo.js';
import { claimInvitation } from '../services/invitations.js';

const router = Router();
const loginLimit = rateLimit({ windowMs: 15*60*1000, limit: 30, standardHeaders: 'draft-8', legacyHeaders: false, message: { error: 'Too many sign-in attempts. Try again in 15 minutes.' } });
const demoLimit = rateLimit({ windowMs: 60*60*1000, limit: 20, standardHeaders: 'draft-8', legacyHeaders: false, message: { error: 'Demo creation limit reached. Please try again later.' } });
async function revokePrevious(req: Parameters<typeof sessionId>[0]) {
  const id = sessionId(req);
  if (id) await prisma.session.deleteMany({ where: { id } });
}
router.post('/register', loginLimit, async (req, res) => {
  const input = z.object({ name: nameSchema, email: emailSchema, password: passwordSchema, workspace: nameSchema.optional(), invitation: z.string().regex(/^[a-f0-9]{64}$/).optional() }).strict().parse(req.body);
  if (!input.workspace && !input.invitation) throw new HttpError(400, 'Enter a workspace name.');
  const passwordHash = await bcrypt.hash(input.password, 12);
  const result = await prisma.$transaction(async tx => {
    const user = await tx.user.create({ data: { name: input.name, email: input.email, passwordHash } });
    let workspaceId: string;
    if (input.invitation) workspaceId = await claimInvitation(tx, input.invitation, user.id, user.email);
    else {
      const workspace = await tx.workspace.create({ data: { name: input.workspace!, members: { create: { userId: user.id, role: 'ADMIN' } } } });
      workspaceId = workspace.id;
    }
    return { userId: user.id, workspaceId };
  });
  await revokePrevious(req);
  await issueSession(res, result.userId, result.workspaceId);
  res.status(201).json({ message: 'Your workspace is ready.' });
});
router.post('/login', loginLimit, async (req, res) => {
  const { email, password } = z.object({ email: emailSchema, password: z.string().min(1).max(200) }).strict().parse(req.body);
  const user = await prisma.user.findUnique({ where: { email }, include: { memberships: { where: { isActive: true }, orderBy: { createdAt: 'asc' } } } });
  // A fixed valid bcrypt hash also gives unknown accounts a password-comparison cost.
  const valid = await bcrypt.compare(password, user?.passwordHash ?? '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxlnQnJ2EV8zHhN7k7rR9fUZMaG');
  if (!user || user.isDemo || !valid) throw new HttpError(401, 'Email or password is incorrect.');
  const membership = user.memberships[0];
  if (!membership) throw new HttpError(403, 'No active workspace access. Contact your workspace administrator.');
  await revokePrevious(req);
  await issueSession(res, user.id, membership.workspaceId);
  res.json({ message: 'Signed in.' });
});
router.post('/demo', demoLimit, async (req, res) => {
  const { user, workspace } = await createDemo();
  await revokePrevious(req);
  await issueSession(res, user.id, workspace.id, true);
  res.status(201).json({ message: 'Your private demo is ready. Synthetic data expires in 24 hours.' });
});
router.post('/logout', async (req, res) => { await revokePrevious(req); clearSession(res); res.status(204).end(); });
router.get('/me', authenticate, async (req, res) => { res.json(await me(req)); });
router.post('/switch', authenticate, async (req, res) => {
  const { workspaceId } = z.object({ workspaceId: idSchema }).strict().parse(req.body);
  const current = identity(req);
  const member = await prisma.membership.findUnique({ where: { userId_workspaceId: { userId: current.user.id, workspaceId } } });
  if (!member?.isActive) throw new HttpError(403, 'You do not have access to this workspace.');
  await prisma.session.update({ where: { id: current.sessionId }, data: { workspaceId } });
  res.json({ message: 'Workspace changed.' });
});
router.patch('/profile', authenticate, async (req, res) => {
  const { name } = z.object({ name: nameSchema }).strict().parse(req.body);
  await prisma.user.update({ where: { id: identity(req).user.id }, data: { name } });
  res.json({ message: 'Profile saved.' });
});
router.post('/password', loginLimit, authenticate, async (req, res) => {
  const { currentPassword, newPassword } = z.object({ currentPassword: z.string().max(200), newPassword: passwordSchema }).strict().parse(req.body);
  const current = identity(req);
  if (!current.user.passwordHash || !await bcrypt.compare(currentPassword, current.user.passwordHash)) throw new HttpError(400, 'Current password is incorrect.');
  const passwordHash = await bcrypt.hash(newPassword, 12);
  await prisma.$transaction([
    prisma.user.update({ where: { id: current.user.id }, data: { passwordHash } }),
    prisma.session.deleteMany({ where: { userId: current.user.id, id: { not: current.sessionId } } }),
  ]);
  res.json({ message: 'Password updated. Other sessions have been signed out.' });
});
export default router;
