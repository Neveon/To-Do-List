import type { ListTodosQueryParams, Todo } from '@todo/shared';
import { useCallback } from 'react';
import { getTodo, listTodos } from '../api/todos';
import { useApiData, type ApiData } from './useApiData';

/** Loads the todo list, refetching whenever the filter or sort changes. */
export function useTodos({ status, sortBy, order }: ListTodosQueryParams = {}): ApiData<Todo[]> {
  const load = useCallback(
    (signal: AbortSignal) => listTodos({ status, sortBy, order }, signal),
    [status, sortBy, order],
  );
  return useApiData(load);
}

/** Loads a single todo, refetching whenever the id changes. */
export function useTodo(id: string): ApiData<Todo> {
  const load = useCallback((signal: AbortSignal) => getTodo(id, signal), [id]);
  return useApiData(load);
}
