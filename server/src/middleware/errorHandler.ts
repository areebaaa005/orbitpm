import { Request, Response, NextFunction } from 'express';
import { ApiError } from '../utils/ApiError';
import { env } from '../config/env';

export function notFoundHandler(req: Request, res: Response) {
  res.status(404).json({
    success: false,
    error: { code: 'ROUTE_NOT_FOUND', message: `No route for ${req.method} ${req.originalUrl}`, details: null },
  });
}

export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction) {
  if (err instanceof ApiError) {
    if (env.nodeEnv !== 'production') {
      console.error(`[error] ${err.code}: ${err.message}`);
    }
    return res.status(err.statusCode).json({
      success: false,
      error: { code: err.code, message: err.message, details: err.details },
    });
  }

  // Mongoose duplicate key error
  if ((err as any)?.code === 11000) {
    return res.status(409).json({
      success: false,
      error: { code: 'DUPLICATE_KEY', message: 'A record with this value already exists', details: null },
    });
  }

  console.error('[unhandled error]', err);
  return res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: env.nodeEnv === 'production' ? 'Something went wrong' : String(err),
      details: null,
    },
  });
}
