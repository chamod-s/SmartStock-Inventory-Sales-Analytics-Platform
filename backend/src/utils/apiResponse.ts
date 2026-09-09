import { Response } from 'express';
import { IApiResponse } from '../types';

export class ApiResponse {
  public static success<T>(
    res: Response,
    message: string,
    data: T = {} as T,
    statusCode: number = 200
  ): Response {
    const response: IApiResponse<T> = {
      success: true,
      message,
      data,
      timestamp: new Date().toISOString(),
    };
    return res.status(statusCode).json(response);
  }

  public static created<T>(
    res: Response,
    message: string,
    data: T = {} as T
  ): Response {
    return ApiResponse.success(res, message, data, 201);
  }

  public static noContent(res: Response): Response {
    return res.status(204).send();
  }
}
