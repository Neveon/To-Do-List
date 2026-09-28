import express from 'express';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { NotFoundError } from '../errors';
import { createErrorHandler, notFoundHandler } from './error-handler';

/** A minimal app whose single route fails with the given error. */
function appThrowing(error: unknown, logError = vi.fn()) {
  const app = express();
  app.get('/fail', () => {
    throw error;
  });
  app.use(notFoundHandler);
  app.use(createErrorHandler(logError));
  return app;
}

describe('createErrorHandler', () => {
  it('maps a ZodError to 400 VALIDATION_ERROR with one detail per issue', async () => {
    const schema = z.object({ title: z.string(), nested: z.object({ count: z.number() }) });
    const zodError = schema.safeParse({ nested: { count: 'x' } }).error;

    const response = await request(appThrowing(zodError)).get('/fail');

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Request validation failed',
        details: [
          { path: 'title', message: expect.any(String) as string },
          { path: 'nested.count', message: expect.any(String) as string },
        ],
      },
    });
  });

  it('maps NotFoundError to 404 NOT_FOUND', async () => {
    const response = await request(appThrowing(new NotFoundError('Todo', 'abc'))).get('/fail');

    expect(response.status).toBe(404);
    expect(response.body).toEqual({
      error: { code: 'NOT_FOUND', message: "Todo with id 'abc' was not found" },
    });
  });

  it('passes through exposable 4xx errors from middleware as BAD_REQUEST', async () => {
    const tooLarge = Object.assign(new Error('request entity too large'), {
      status: 413,
      expose: true,
    });

    const response = await request(appThrowing(tooLarge)).get('/fail');

    expect(response.status).toBe(413);
    expect(response.body).toEqual({
      error: { code: 'BAD_REQUEST', message: 'request entity too large' },
    });
  });

  it('hides unexpected errors behind a generic 500 and logs them', async () => {
    const logError = vi.fn();
    const failure = new Error('database password is hunter2');

    const response = await request(appThrowing(failure, logError)).get('/fail');

    expect(response.status).toBe(500);
    expect(response.body).toEqual({
      error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' },
    });
    expect(JSON.stringify(response.body)).not.toContain('hunter2');
    expect(logError).toHaveBeenCalledWith(expect.any(String), failure);
  });

  it('treats errors that are not safe to expose as unexpected', async () => {
    const internal = Object.assign(new Error('secret detail'), { status: 400, expose: false });

    const response = await request(appThrowing(internal)).get('/fail');

    expect(response.status).toBe(500);
  });
});

describe('notFoundHandler', () => {
  it('responds 404 NOT_FOUND naming the method and path', async () => {
    const response = await request(appThrowing(new Error('unused'))).delete('/nowhere?x=1');

    expect(response.status).toBe(404);
    expect(response.body).toEqual({
      error: { code: 'NOT_FOUND', message: 'Route DELETE /nowhere was not found' },
    });
  });
});
