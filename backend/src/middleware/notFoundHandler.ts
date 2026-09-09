import { Request, Response } from 'express';
import { IApiErrorResponse } from '../types';

export const notFoundHandler = (req: Request, res: Response): void => {
  const response: IApiErrorResponse = {
    success: false,
    message: `Cannot ${req.method} ${req.originalUrl} - Route not found`,
    errors: [],
    timestamp: new Date().toISOString(),
  };
  res.status(404).json(response);
};
