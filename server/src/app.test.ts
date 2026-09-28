import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import { InMemoryTodoRepository } from '../test/support/in-memory-todo.repository';
import { createApp } from './app';
import { TodoService } from './todos/todo.service';

describe('createApp', () => {
  const todoService = new TodoService({ repository: new InMemoryTodoRepository() });
  const app = createApp({ todoService, logError: vi.fn() });

  it('reports health at GET /api/health', async () => {
    const response = await request(app).get('/api/health');

    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toMatch(/application\/json/);
    expect(response.body).toEqual({ status: 'ok' });
  });

  it('responds 404 in the standard error format for unknown routes', async () => {
    const response = await request(app).get('/api/unknown');

    expect(response.status).toBe(404);
    expect(response.body).toEqual({
      error: { code: 'NOT_FOUND', message: 'Route GET /api/unknown was not found' },
    });
  });

  it('responds 400 when the request body is malformed JSON', async () => {
    const response = await request(app)
      .post('/api/health')
      .set('Content-Type', 'application/json')
      .send('{ "title": ');

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      error: { code: 'BAD_REQUEST', message: 'Request body must be valid JSON' },
    });
  });

  it('does not advertise the framework in response headers', async () => {
    const response = await request(app).get('/api/health');

    expect(response.headers).not.toHaveProperty('x-powered-by');
  });
});
