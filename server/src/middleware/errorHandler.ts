import { Request, Response, NextFunction } from 'express';

export function errorHandler(err: any, req: Request, res: Response, next: NextFunction) {
  console.error(`[Error] ${req.method} ${req.url}:`, err);

  const statusCode = err.status || err.statusCode || 500;
  const message = err.message || 'An unexpected server error occurred';

  res.status(statusCode).json({
    error: err.name || 'InternalServerError',
    message,
    ...(process.env.NODE_ENV === 'development' ? { stack: err.stack } : {})
  });
}
