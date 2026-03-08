import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/errors';
import { logger } from '../utils/logger';

export function errorMiddleware(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err instanceof AppError) {
    logger.warn('Operational error', { message: err.message, statusCode: err.statusCode });
    res.status(err.statusCode).json({
      error: {
        message: err.message,
        statusCode: err.statusCode,
      },
    });
    return;
  }

  // Unhandled/unexpected errors
  logger.error('Unexpected error', { message: err.message, stack: err.stack });
  res.status(500).json({
    error: {
      message: 'An unexpected error occurred',
      statusCode: 500,
    },
  });
}

export function notFoundMiddleware(_req: Request, res: Response): void {
  res.status(404).json({
    error: {
      message: 'Route not found',
      statusCode: 404,
    },
  });
}
