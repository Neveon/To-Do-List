import type { ApiErrorCode, ApiErrorDetail, ApiErrorResponse } from '@todo/shared';
import type { ErrorRequestHandler, RequestHandler, Response } from 'express';
import { ZodError } from 'zod';
import { NotFoundError } from '../errors';

export type ErrorLogger = (message: string, error: unknown) => void;

function sendError(
  res: Response,
  status: number,
  code: ApiErrorCode,
  message: string,
  details?: ApiErrorDetail[],
): void {
  const body: ApiErrorResponse = { error: { code, message, ...(details && { details }) } };
  res.status(status).json(body);
}

/** Responds to any request that no route handled. */
export const notFoundHandler: RequestHandler = (req, res) => {
  sendError(res, 404, 'NOT_FOUND', `Route ${req.method} ${req.path} was not found`);
};

/**
 * Translates errors into the uniform `{ error: { code, message, details? } }` body.
 * Unexpected errors are logged and reported as a generic 500 so internals never leak.
 */
export function createErrorHandler(logError: ErrorLogger): ErrorRequestHandler {
  return (error: unknown, _req, res, next) => {
    if (res.headersSent) {
      next(error);
      return;
    }

    if (error instanceof ZodError) {
      const details = error.issues.map((issue) => ({
        path: issue.path.map(String).join('.'),
        message: issue.message,
      }));
      sendError(res, 400, 'VALIDATION_ERROR', 'Request validation failed', details);
      return;
    }

    if (error instanceof NotFoundError) {
      sendError(res, 404, 'NOT_FOUND', error.message);
      return;
    }

    if (isClientError(error)) {
      const message =
        error.type === 'entity.parse.failed' ? 'Request body must be valid JSON' : error.message;
      sendError(res, error.status, 'BAD_REQUEST', message);
      return;
    }

    logError('Unhandled error while processing request', error);
    sendError(res, 500, 'INTERNAL_ERROR', 'An unexpected error occurred');
  };
}

interface ClientError extends Error {
  status: number;
  type?: string;
}

/** 4xx errors raised by Express middleware (e.g. the JSON body parser) that are safe to expose. */
function isClientError(error: unknown): error is ClientError {
  return (
    error instanceof Error &&
    'status' in error &&
    typeof error.status === 'number' &&
    error.status >= 400 &&
    error.status < 500 &&
    'expose' in error &&
    error.expose === true
  );
}
