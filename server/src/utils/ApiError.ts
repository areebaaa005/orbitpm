export class ApiError extends Error {
  statusCode: number;
  code: string;
  details: unknown;
  isOperational: boolean;

  constructor(statusCode: number, code: string, message: string, details: unknown = null) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }

  static badRequest(code: string, message: string, details: unknown = null) {
    return new ApiError(400, code, message, details);
  }
  static unauthorized(message = 'Authentication required') {
    return new ApiError(401, 'UNAUTHORIZED', message);
  }
  static forbidden(message = 'You do not have permission to perform this action') {
    return new ApiError(403, 'FORBIDDEN', message);
  }
  static notFound(message = 'Resource not found') {
    return new ApiError(404, 'NOT_FOUND', message);
  }
  static conflict(message: string) {
    return new ApiError(409, 'CONFLICT', message);
  }
  static internal(message = 'Something went wrong') {
    return new ApiError(500, 'INTERNAL_ERROR', message);
  }
}
