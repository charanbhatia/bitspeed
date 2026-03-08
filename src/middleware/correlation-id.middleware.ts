import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';

declare global {
  namespace Express {
    interface Request {
      correlationId: string;
    }
  }
}

export function correlationIdMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const id =
    (req.headers['x-correlation-id'] as string | undefined) ||
    (req.headers['x-request-id'] as string | undefined) ||
    randomUUID();

  req.correlationId = id;
  res.setHeader('x-correlation-id', id);
  next();
}
