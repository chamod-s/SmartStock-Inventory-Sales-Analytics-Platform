import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';
import { ApiError } from '../utils/apiError';
import { IApiErrorResponse } from '../types';

export const errorHandler = (
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  let statusCode = 500;
  let message = 'Internal Server Error';
  let errors: unknown[] = [];

  if (err instanceof ApiError) {
    statusCode = err.statusCode;
    message = err.message;
    errors = err.errors;
  } else if (err instanceof ZodError) {
    statusCode = 400;
    message = 'Validation Error';
    errors = err.errors.map((e) => ({
      field: e.path.join('.'),
      message: e.message,
      code: e.code,
    }));
  } else if (err instanceof Prisma.PrismaClientKnownRequestError) {
    statusCode = 400;
    if (err.code === 'P2002') {
      const target = (err.meta?.target as string[]) || [];
      message = `Duplicate field value entered: ${target.join(', ')}`;
    } else if (err.code === 'P2025') {
      statusCode = 404;
      message = 'Record not found in database';
    } else {
      message = `Database Error: ${err.message}`;
    }
    errors = [{ code: err.code, meta: err.meta }];
  } else if (err instanceof SyntaxError && 'status' in err && err.status === 400) {
    statusCode = 400;
    message = 'Malformed JSON in request body';
  } else if (err instanceof Error) {
    message = err.message || 'An unexpected error occurred';
  }

  const response: IApiErrorResponse = {
    success: false,
    message,
    errors,
    timestamp: new Date().toISOString(),
  };

  if (process.env.NODE_ENV === 'development' && statusCode === 500) {
    console.error('🔥 Server Error Stack:', err.stack);
  }

  res.status(statusCode).json(response);
};
