import { Request, Response, NextFunction } from 'express';
import { UserRole } from '@prisma/client';
import { authService } from '../services/auth.service';
import { ApiError } from '../utils/apiError';

export const authenticate = (
  req: Request,
  _res: Response,
  next: NextFunction
): void => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(ApiError.unauthorized('Authentication required. Missing or malformed Bearer token'));
  }

  const token = authHeader.split(' ')[1];

  if (!token) {
    return next(ApiError.unauthorized('Authentication required. Missing Bearer token'));
  }

  try {
    const payload = authService.verifyToken(token);
    req.user = payload;
    return next();
  } catch (error) {
    return next(error);
  }
};

export const authorize = (...allowedRoles: UserRole[]) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(ApiError.unauthorized('Authentication required'));
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(
        ApiError.forbidden(
          `Access forbidden. Role '${req.user.role}' does not have sufficient permissions for this operation`
        )
      );
    }

    return next();
  };
};
