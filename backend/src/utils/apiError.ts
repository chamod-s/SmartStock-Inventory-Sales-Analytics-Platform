export class ApiError extends Error {
  public readonly statusCode: number;
  public readonly errors: unknown[];
  public readonly isOperational: boolean;

  constructor(
    message: string,
    statusCode: number = 500,
    errors: unknown[] = [],
    isOperational: boolean = true
  ) {
    super(message);
    this.statusCode = statusCode;
    this.errors = errors;
    this.isOperational = isOperational;
    Object.setPrototypeOf(this, ApiError.prototype);
    Error.captureStackTrace(this, this.constructor);
  }

  public static badRequest(message: string, errors: unknown[] = []): ApiError {
    return new ApiError(message, 400, errors);
  }

  public static unauthorized(message: string = 'Unauthorized access'): ApiError {
    return new ApiError(message, 401);
  }

  public static forbidden(message: string = 'Forbidden resource access'): ApiError {
    return new ApiError(message, 403);
  }

  public static notFound(message: string = 'Requested resource not found'): ApiError {
    return new ApiError(message, 404);
  }

  public static conflict(message: string): ApiError {
    return new ApiError(message, 409);
  }

  public static unprocessableEntity(message: string, errors: unknown[] = []): ApiError {
    return new ApiError(message, 422, errors);
  }

  public static internal(message: string = 'Internal Server Error'): ApiError {
    return new ApiError(message, 500, [], false);
  }
}
