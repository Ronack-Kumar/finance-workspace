import type { ErrorRequestHandler } from 'express';
import { ZodError } from 'zod';
export class HttpError extends Error {
  constructor(public status: number, message: string) { super(message); }
}
export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof ZodError) {
    res.status(400).json({ error: err.issues[0]?.message ?? 'Invalid input.', details: err.issues });
  } else if (err instanceof HttpError) {
    res.status(err.status).json({ error: err.message });
  } else if (err?.code === 'P2002') {
    res.status(409).json({ error: 'An account or membership with those details already exists.' });
  } else if (err?.code === 'P2025') {
    res.status(404).json({ error: 'Resource not found.' });
  } else if (err?.type === 'entity.parse.failed') {
    res.status(400).json({ error: 'Invalid JSON.' });
  } else if (err?.type === 'entity.too.large') {
    res.status(413).json({ error: 'Request is too large.' });
  } else {
    console.error('Request failed:', err);
    res.status(500).json({ error: 'Something went wrong. Please try again.' });
  }
};
