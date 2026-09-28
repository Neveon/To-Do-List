import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { makeTodo } from '../test/make-todo';
import { server } from '../test/server';
import { ApiError } from './http';
import {
  completeTodo,
  createTodo,
  deleteTodo,
  getTodo,
  incompleteTodo,
  listTodos,
  updateTodo,
} from './todos';

/** Records the requests MSW receives so tests can assert on method, URL and body. */
function captureRequests() {
  const requests: Request[] = [];
  server.events.on('request:start', ({ request }) => {
    requests.push(request.clone());
  });
  return requests;
}

describe('todos API client', () => {
  it('lists todos', async () => {
    const todos = [makeTodo(), makeTodo()];
    server.use(http.get('/api/todos', () => HttpResponse.json(todos)));

    expect(await listTodos()).toEqual(todos);
  });

  it('sends only the provided list query parameters', async () => {
    const requests = captureRequests();
    server.use(http.get('/api/todos', () => HttpResponse.json([])));

    await listTodos({ status: 'overdue', sortBy: 'dueDate', order: undefined });

    expect(new URL(requests[0]!.url).search).toBe('?status=overdue&sortBy=dueDate');
  });

  it('gets a todo by id, encoding the id', async () => {
    const todo = makeTodo({ id: 'a/b' });
    const requests = captureRequests();
    server.use(http.get('/api/todos/:id', () => HttpResponse.json(todo)));

    expect(await getTodo('a/b')).toEqual(todo);
    expect(new URL(requests[0]!.url).pathname).toBe('/api/todos/a%2Fb');
  });

  it('creates a todo by POSTing JSON', async () => {
    const created = makeTodo({ title: 'Buy milk' });
    const requests = captureRequests();
    server.use(http.post('/api/todos', () => HttpResponse.json(created, { status: 201 })));

    expect(await createTodo({ title: 'Buy milk' })).toEqual(created);
    expect(requests[0]!.headers.get('content-type')).toBe('application/json');
    expect(await requests[0]!.json()).toEqual({ title: 'Buy milk' });
  });

  it('updates a todo by PATCHing the changes', async () => {
    const updated = makeTodo({ id: 'todo-9', title: 'New' });
    const requests = captureRequests();
    server.use(http.patch('/api/todos/todo-9', () => HttpResponse.json(updated)));

    expect(await updateTodo('todo-9', { title: 'New', dueDate: null })).toEqual(updated);
    expect(await requests[0]!.json()).toEqual({ title: 'New', dueDate: null });
  });

  it.each([
    ['completeTodo', completeTodo, 'complete'],
    ['incompleteTodo', incompleteTodo, 'incomplete'],
  ])('%s POSTs to the %s action without a body', async (_name, action, path) => {
    const todo = makeTodo({ id: 'todo-9' });
    const requests = captureRequests();
    server.use(http.post(`/api/todos/todo-9/${path}`, () => HttpResponse.json(todo)));

    expect(await action('todo-9')).toEqual(todo);
    expect(requests[0]!.headers.get('content-type')).toBeNull();
  });

  it('deletes a todo and resolves with nothing on 204', async () => {
    server.use(http.delete('/api/todos/todo-9', () => new HttpResponse(null, { status: 204 })));

    await expect(deleteTodo('todo-9')).resolves.toBeUndefined();
  });

  describe('errors', () => {
    it('throws an ApiError carrying the server error body', async () => {
      server.use(
        http.post('/api/todos', () =>
          HttpResponse.json(
            {
              error: {
                code: 'VALIDATION_ERROR',
                message: 'Request validation failed',
                details: [{ path: 'title', message: 'Title is required' }],
              },
            },
            { status: 400 },
          ),
        ),
      );

      const error = await createTodo({ title: '' }).catch((caught: unknown) => caught);

      expect(error).toBeInstanceOf(ApiError);
      expect(error).toMatchObject({
        status: 400,
        code: 'VALIDATION_ERROR',
        message: 'Request validation failed',
        details: [{ path: 'title', message: 'Title is required' }],
      });
    });

    it('maps a 404 to a NOT_FOUND ApiError', async () => {
      server.use(
        http.get('/api/todos/:id', () =>
          HttpResponse.json(
            { error: { code: 'NOT_FOUND', message: "Todo with id 'x' was not found" } },
            { status: 404 },
          ),
        ),
      );

      await expect(getTodo('x')).rejects.toMatchObject({
        status: 404,
        code: 'NOT_FOUND',
        details: [],
      });
    });

    it('reports a non-JSON error response with its status', async () => {
      server.use(http.get('/api/todos', () => new HttpResponse('Bad Gateway', { status: 502 })));

      await expect(listTodos()).rejects.toMatchObject({
        status: 502,
        code: 'UNKNOWN_ERROR',
        message: 'Request failed with status 502',
      });
    });

    it('reports an unreachable server as a NETWORK_ERROR', async () => {
      server.use(http.get('/api/todos', () => HttpResponse.error()));

      await expect(listTodos()).rejects.toMatchObject({
        status: 0,
        code: 'NETWORK_ERROR',
        message: 'Could not reach the server. Is it running?',
      });
    });

    it('rethrows aborts untouched so callers can ignore them', async () => {
      server.use(http.get('/api/todos', () => HttpResponse.json([])));
      const controller = new AbortController();
      controller.abort();

      const error = await listTodos({}, controller.signal).catch((caught: unknown) => caught);

      expect(error).not.toBeInstanceOf(ApiError);
      expect(error).toMatchObject({ name: 'AbortError' });
    });
  });
});
