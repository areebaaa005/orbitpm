import { Request, Response, NextFunction } from 'express';
import { AnyZodObject, ZodError } from 'zod';
import { ApiError } from '../utils/ApiError';

export function validate(schema: AnyZodObject) {
  return (req: Request, _res: Response, next: NextFunction) => {
    try {
      schema.parse({ body: req.body, params: req.params, query: req.query });
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        return next(
          ApiError.badRequest('VALIDATION_ERROR', 'Invalid request data', err.flatten())
        );
      }
      next(err);
    }
  };
}
