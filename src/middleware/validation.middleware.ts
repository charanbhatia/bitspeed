import { Request, Response, NextFunction } from 'express';
import { ValidationError } from '../utils/errors';
import { IIdentifyRequest } from '../interfaces/identify.interface';

export function validateIdentifyRequest(
  req: Request,
  _res: Response,
  next: NextFunction,
): void {
  const { email, phoneNumber }: IIdentifyRequest = req.body;

  // The request body must be a plain object
  if (typeof req.body !== 'object' || req.body === null || Array.isArray(req.body)) {
    return next(new ValidationError('Request body must be a JSON object'));
  }

  const hasEmail = email !== undefined && email !== null && email !== '';
  const hasPhone = phoneNumber !== undefined && phoneNumber !== null && phoneNumber !== '';

  if (!hasEmail && !hasPhone) {
    return next(new ValidationError('At least one of email or phoneNumber must be provided'));
  }

  if (hasEmail && typeof email !== 'string') {
    return next(new ValidationError('email must be a string'));
  }

  if (hasPhone && typeof phoneNumber !== 'string') {
    return next(new ValidationError('phoneNumber must be a string'));
  }

  if (hasEmail) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test((email as string).trim())) {
      return next(new ValidationError('email must be a valid email address'));
    }
  }

  next();
}
