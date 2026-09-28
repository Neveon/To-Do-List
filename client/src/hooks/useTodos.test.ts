import type { ListTodosQueryParams } from '@todo/shared';
import { renderHook, waitFor } from '@testing-library/react';
import { delay, http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { ApiError } from '../api/http';
import { makeTodo } from '../test/make-todo';
import { server } from '../test/server';
import { useTodo, useTodos } from './useTodos';

describe('useTodos', () => {
  it('starts loading, then provides the todos', async () => {
    const todos = [makeTodo(), makeTodo()];
    server.use(http.get('/api/todos', () => HttpResponse.json(todos)));

    const { result } = renderHook(() => useTodos());

    expect(result.current).toMatchObject({ isLoading: true, data: undefined });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current).toMatchObject({ data: todos, error: undefined });
  });

  it('refetches with the new query when the filter changes', async () => {
    server.use(
      http.get('/api/todos', ({ request }) => {
        const status = new URL(request.url).searchParams.get('status') ?? 'all';
        return HttpResponse.json([makeTodo({ title: status })]);
      }),
    );

    const { result, rerender } = renderHook((query: ListTodosQueryParams) => useTodos(query), {
      initialProps: { status: 'all' },
    });
    await waitFor(() => expect(result.current.data?.[0]?.title).toBe('all'));

    rerender({ status: 'completed' });

    await waitFor(() => expect(result.current.data?.[0]?.title).toBe('completed'));
  });

  it('keeps the previous data visible while reloading', async () => {
    let calls = 0;
    server.use(
      http.get('/api/todos', async () => {
        calls += 1;
        if (calls > 1) await delay(50);
        return HttpResponse.json([makeTodo({ title: `call ${calls}` })]);
      }),
    );
    const { result } = renderHook(() => useTodos());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    result.current.reload();

    await waitFor(() => expect(result.current.isLoading).toBe(true));
    expect(result.current.data?.[0]?.title).toBe('call 1');
    await waitFor(() => expect(result.current.data?.[0]?.title).toBe('call 2'));
    expect(result.current.isLoading).toBe(false);
  });

  it('ignores a slow response that was superseded by a newer query', async () => {
    server.use(
      http.get('/api/todos', async ({ request }) => {
        const status = new URL(request.url).searchParams.get('status');
        if (status === 'completed') await delay(100);
        return HttpResponse.json([makeTodo({ title: status ?? 'all' })]);
      }),
    );
    const { result, rerender } = renderHook((query: ListTodosQueryParams) => useTodos(query), {
      initialProps: { status: 'completed' },
    });

    rerender({ status: 'incomplete' });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    await delay(150);
    expect(result.current.data?.[0]?.title).toBe('incomplete');
  });

  it('exposes a failed request as an error', async () => {
    server.use(
      http.get('/api/todos', () =>
        HttpResponse.json({ error: { code: 'INTERNAL_ERROR', message: 'Boom' } }, { status: 500 }),
      ),
    );

    const { result } = renderHook(() => useTodos());

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.error).toBeInstanceOf(ApiError);
    expect(result.current.error?.message).toBe('Boom');
  });
});

describe('useTodo', () => {
  it('loads the todo with the given id', async () => {
    const todo = makeTodo({ id: 'todo-42' });
    server.use(http.get('/api/todos/todo-42', () => HttpResponse.json(todo)));

    const { result } = renderHook(() => useTodo('todo-42'));

    await waitFor(() => expect(result.current.data).toEqual(todo));
  });

  it('exposes a NOT_FOUND error for an unknown id', async () => {
    server.use(
      http.get('/api/todos/:id', () =>
        HttpResponse.json({ error: { code: 'NOT_FOUND', message: 'Not found' } }, { status: 404 }),
      ),
    );

    const { result } = renderHook(() => useTodo('missing'));

    await waitFor(() => expect(result.current.error).toMatchObject({ code: 'NOT_FOUND' }));
  });
});
