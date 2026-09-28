import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import type { Express } from 'express';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { InMemoryTodoRepository } from '../../test/support/in-memory-todo.repository';
import { createApp } from '../app';
import { TodoService } from '../todos/todo.service';

const INDEX_HTML = '<!doctype html><title>To-Do List</title><div id="root"></div>';

function createTestApp(clientDir?: string): Express {
  const todoService = new TodoService({ repository: new InMemoryTodoRepository() });
  return createApp({ todoService, logError: vi.fn(), clientDir });
}

describe('serving the client app', () => {
  let clientDir: string;
  let app: Express;

  beforeAll(async () => {
    clientDir = await mkdtemp(path.join(tmpdir(), 'todo-client-'));
    await mkdir(path.join(clientDir, 'assets'));
    await writeFile(path.join(clientDir, 'index.html'), INDEX_HTML);
    await writeFile(path.join(clientDir, 'assets', 'index-abc123.js'), 'console.log("app");');
    await writeFile(path.join(clientDir, 'favicon.svg'), '<svg/>');
    app = createTestApp(clientDir);
  });

  afterAll(async () => {
    await rm(clientDir, { recursive: true, force: true });
  });

  it.each(['/', '/todos/some-id', '/some/unknown/page'])(
    'returns index.html for the client route %s without caching it',
    async (route) => {
      const response = await request(app).get(route);

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toMatch(/text\/html/);
      expect(response.headers['cache-control']).toBe('no-cache');
      expect(response.text).toBe(INDEX_HTML);
    },
  );

  it('serves fingerprinted assets with a long-lived cache', async () => {
    const response = await request(app).get('/assets/index-abc123.js');

    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toMatch(/javascript/);
    expect(response.headers['cache-control']).toBe('public, max-age=31536000, immutable');
  });

  it('serves other static files without the long-lived cache', async () => {
    const response = await request(app).get('/favicon.svg');

    expect(response.status).toBe(200);
    expect(response.headers['cache-control']).not.toMatch(/immutable/);
  });

  it('still answers API requests from the API', async () => {
    const response = await request(app).get('/api/todos');

    expect(response.status).toBe(200);
    expect(response.body).toEqual([]);
  });

  it.each(['/api', '/api/unknown'])(
    'keeps JSON 404s for the unknown API route %s',
    async (route) => {
      const response = await request(app).get(route);

      expect(response.status).toBe(404);
      expect(response.body).toMatchObject({ error: { code: 'NOT_FOUND' } });
    },
  );

  it('does not answer non-GET requests with index.html', async () => {
    const response = await request(app).post('/todos/some-id');

    expect(response.status).toBe(404);
    expect(response.body).toMatchObject({ error: { code: 'NOT_FOUND' } });
  });

  it('serves the API only when no client directory is given', async () => {
    const response = await request(createTestApp()).get('/');

    expect(response.status).toBe(404);
    expect(response.body).toMatchObject({ error: { code: 'NOT_FOUND' } });
  });
});
