import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import type { Todo } from '@todo/shared';
import type { Express } from 'express';
import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createApp } from '../src/app';
import { JsonFileTodoRepository } from '../src/todos/repository/json-file.repository';
import { TodoService } from '../src/todos/todo.service';

const NOW = '2026-09-27T12:00:00.000Z';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

let dataDir: string;
let dataFile: string;
let app: Express;

/** Wires the app exactly like production, but with a temporary data file and a fixed clock. */
function createTestApp(): Express {
  const repository = new JsonFileTodoRepository(dataFile);
  const todoService = new TodoService({ repository, now: () => new Date(NOW) });
  return createApp({ todoService, logError: vi.fn() });
}

async function createTodo(body: Record<string, unknown> = { title: 'Buy milk' }): Promise<Todo> {
  const response = await request(app).post('/api/todos').send(body).expect(201);
  return response.body as Todo;
}

beforeEach(async () => {
  dataDir = await mkdtemp(path.join(tmpdir(), 'todo-api-'));
  dataFile = path.join(dataDir, 'todos.json');
  app = createTestApp();
});

afterEach(async () => {
  await rm(dataDir, { recursive: true, force: true });
});

describe('POST /api/todos', () => {
  it('creates a todo and responds 201 with it and its location', async () => {
    const response = await request(app)
      .post('/api/todos')
      .send({ title: 'Pay rent', description: 'Transfer to landlord', dueDate: '2026-10-01' });

    expect(response.status).toBe(201);
    expect(response.body).toEqual({
      id: expect.stringMatching(UUID) as string,
      title: 'Pay rent',
      description: 'Transfer to landlord',
      dueDate: '2026-10-01',
      isCompleted: false,
      createdAt: NOW,
    });
    expect(response.headers.location).toBe(`/api/todos/${(response.body as Todo).id}`);
  });

  it('defaults optional fields to null', async () => {
    expect(await createTodo({ title: 'Buy milk' })).toMatchObject({
      description: null,
      dueDate: null,
    });
  });

  it('writes the todo to the data file', async () => {
    const todo = await createTodo();

    expect(JSON.parse(await readFile(dataFile, 'utf8'))).toEqual({ todos: [todo] });
  });

  it('responds 400 with field details when the title is missing', async () => {
    const response = await request(app).post('/api/todos').send({ description: 'No title' });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Request validation failed',
        details: [{ path: 'title', message: expect.any(String) as string }],
      },
    });
  });

  it('responds 400 for an invalid due date', async () => {
    const response = await request(app)
      .post('/api/todos')
      .send({ title: 'Buy milk', dueDate: '2026-02-30' });

    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({ error: { details: [{ path: 'dueDate' }] } });
  });

  it('responds 400 when the client tries to set server-owned fields', async () => {
    const response = await request(app)
      .post('/api/todos')
      .send({ title: 'Buy milk', isCompleted: true });

    expect(response.status).toBe(400);
  });

  it.each([
    ['no body', undefined],
    ['an array body', [{ title: 'Buy milk' }]],
  ])('responds 400 for %s', async (_case, body) => {
    const response = await request(app).post('/api/todos').send(body);

    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({ error: { code: 'VALIDATION_ERROR' } });
  });

  it('does not store anything when validation fails', async () => {
    await request(app).post('/api/todos').send({ title: '' }).expect(400);

    expect((await request(app).get('/api/todos')).body).toEqual([]);
  });
});

describe('GET /api/todos', () => {
  it('responds 200 with an empty list when there are no todos', async () => {
    const response = await request(app).get('/api/todos');

    expect(response.status).toBe(200);
    expect(response.body).toEqual([]);
  });

  it('responds 200 with every todo', async () => {
    const first = await createTodo({ title: 'First' });
    const second = await createTodo({ title: 'Second' });

    expect((await request(app).get('/api/todos')).body).toEqual([first, second]);
  });
});

describe('GET /api/todos/:id', () => {
  it('responds 200 with the todo', async () => {
    const todo = await createTodo();

    const response = await request(app).get(`/api/todos/${todo.id}`);

    expect(response.status).toBe(200);
    expect(response.body).toEqual(todo);
  });

  it('responds 404 for an unknown id', async () => {
    const response = await request(app).get('/api/todos/does-not-exist');

    expect(response.status).toBe(404);
    expect(response.body).toEqual({
      error: { code: 'NOT_FOUND', message: "Todo with id 'does-not-exist' was not found" },
    });
  });
});

describe('PATCH /api/todos/:id', () => {
  it('updates only the provided fields and responds 200 with the result', async () => {
    const todo = await createTodo({ title: 'Old', description: 'Keep me' });

    const response = await request(app).patch(`/api/todos/${todo.id}`).send({ title: 'New' });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ ...todo, title: 'New' });
    expect((await request(app).get(`/api/todos/${todo.id}`)).body).toEqual(response.body);
  });

  it('clears optional fields sent as null', async () => {
    const todo = await createTodo({ title: 'Buy milk', description: 'x', dueDate: '2026-10-01' });

    const response = await request(app)
      .patch(`/api/todos/${todo.id}`)
      .send({ description: null, dueDate: null });

    expect(response.body).toMatchObject({ description: null, dueDate: null });
  });

  it.each([
    ['an empty body', {}],
    ['an empty title', { title: '' }],
    ['an invalid due date', { dueDate: 'tomorrow' }],
    ['a completion change', { isCompleted: true }],
  ])('responds 400 for %s', async (_case, body) => {
    const todo = await createTodo();

    const response = await request(app).patch(`/api/todos/${todo.id}`).send(body);

    expect(response.status).toBe(400);
    expect((await request(app).get(`/api/todos/${todo.id}`)).body).toEqual(todo);
  });

  it('responds 404 for an unknown id', async () => {
    const response = await request(app).patch('/api/todos/does-not-exist').send({ title: 'New' });

    expect(response.status).toBe(404);
  });
});

describe('DELETE /api/todos/:id', () => {
  it('removes the todo and responds 204 with no body', async () => {
    const todo = await createTodo();

    const response = await request(app).delete(`/api/todos/${todo.id}`);

    expect(response.status).toBe(204);
    expect(response.text).toBe('');
    await request(app).get(`/api/todos/${todo.id}`).expect(404);
  });

  it('responds 404 for an unknown id', async () => {
    const response = await request(app).delete('/api/todos/does-not-exist');

    expect(response.status).toBe(404);
  });
});

describe('persistence', () => {
  it('keeps todos across an application restart', async () => {
    const kept = await createTodo({ title: 'Kept' });
    const edited = await createTodo({ title: 'Before' });
    const removed = await createTodo({ title: 'Removed' });
    await request(app).patch(`/api/todos/${edited.id}`).send({ title: 'After' }).expect(200);
    await request(app).delete(`/api/todos/${removed.id}`).expect(204);

    app = createTestApp();

    expect((await request(app).get('/api/todos')).body).toEqual([
      kept,
      { ...edited, title: 'After' },
    ]);
  });
});
