import type { Request, Response, NextFunction } from 'express';
import type { User, Workspace, Role, Prisma } from '@prisma/client';
import { createHash, randomBytes } from 'node:crypto';
import prisma from '../config/prisma.js';
import { config } from '../config/env.js';
import { HttpError } from './errorHandler.js';

export const hashToken = (token: string) => createHash('sha256').update(token).digest('hex');
export const newToken = () => randomBytes(32).toString('hex');
export type Identity = { user: User; workspace: Workspace; role: Role; sessionId: string };
declare global { namespace Express { interface Request { identity?: Identity } } }
export const identity = (req: Request) => {
  if (!req.identity) throw new HttpError(401, 'Please sign in to continue.');
  return req.identity;
};
export const sessionId = (req: Request) => {
  const token = req.headers.cookie?.split(';').map(v => v.trim()).find(v => v.startsWith(config.sessionCookie + '='))?.split('=')[1];
  return token && /^[a-f0-9]{64}$/.test(token) ? hashToken(token) : undefined;
};
export async function issueSession(res: Response, userId: string, workspaceId: string, isDemo = false) {
  const token = newToken();
  const maxAge = (isDemo ? 1 : 7) * 86400000;
  await prisma.session.create({ data: { id: hashToken(token), userId, workspaceId, expiresAt: new Date(Date.now() + maxAge) } });
  res.cookie(config.sessionCookie, token, { httpOnly: true, sameSite: 'lax', secure: config.production, path: '/', maxAge });
}
export function clearSession(res: Response) {
  res.clearCookie(config.sessionCookie, { httpOnly: true, sameSite: 'lax', secure: config.production, path: '/' });
}
export async function authenticate(req: Request, _res: Response, next: NextFunction) {
  const id = sessionId(req);
  const session = id ? await prisma.session.findUnique({ where: { id }, include: { user: true, workspace: true } }) : null;
  if (!session || session.expiresAt <= new Date() || (session.workspace.expiresAt && session.workspace.expiresAt <= new Date())) {
    throw new HttpError(401, 'Your session has ended. Please sign in again.');
  }
  const member = await prisma.membership.findUnique({ where: { userId_workspaceId: { userId: session.userId, workspaceId: session.workspaceId } } });
  if (!member?.isActive) throw new HttpError(403, 'Your access to this workspace is disabled.');
  req.identity = { user: session.user, workspace: session.workspace, role: member.role, sessionId: session.id };
  next();
}
export const authorize = (...roles: Role[]) => (req: Request, _res: Response, next: NextFunction) => {
  if (!roles.includes(identity(req).role)) throw new HttpError(403, 'Your role does not permit this action.');
  next();
};
// A write obtains SQLite's transaction lock before checking the current role.
// All administrative writes use this, including concurrent last-admin changes.
export async function lockAdmin(tx: Prisma.TransactionClient, req: Request) {
  const current = identity(req);
  await tx.workspace.update({ where: { id: current.workspace.id }, data: { revision: { increment: 1 } } });
  const member = await tx.membership.findUnique({ where: { userId_workspaceId: { userId: current.user.id, workspaceId: current.workspace.id } } });
  if (!member?.isActive || member.role !== 'ADMIN') throw new HttpError(403, 'Administrator access is required.');
  return current;
}
export async function me(req: Request) {
  const current = identity(req);
  const memberships = await prisma.membership.findMany({ where: { userId: current.user.id, isActive: true }, include: { workspace: true }, orderBy: { createdAt: 'asc' } });
  return { user: { id: current.user.id, name: current.user.name, email: current.user.email, isDemo: current.user.isDemo },
    workspace: current.workspace, role: current.role,
    workspaces: memberships.map(m => ({ id: m.workspaceId, name: m.workspace.name, role: m.role })) };
}
