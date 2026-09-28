import type {
  CreateTodoRequest,
  ListTodosQueryParams,
  Todo,
  UpdateTodoRequest,
} from '@todo/shared';
import { request } from './http';

/** One function per API endpoint; see the server's todo routes for the contract. */

export function listTodos(query: ListTodosQueryParams = {}, signal?: AbortSignal): Promise<Todo[]> {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined) {
      params.set(key, value);
    }
  }
  const search = params.size > 0 ? `?${params.toString()}` : '';
  return request<Todo[]>(`/todos${search}`, { signal });
}

export function getTodo(id: string, signal?: AbortSignal): Promise<Todo> {
  return request<Todo>(todoPath(id), { signal });
}

export function createTodo(input: CreateTodoRequest): Promise<Todo> {
  return request<Todo>('/todos', { method: 'POST', body: input });
}

export function updateTodo(id: string, changes: UpdateTodoRequest): Promise<Todo> {
  return request<Todo>(todoPath(id), { method: 'PATCH', body: changes });
}

export function completeTodo(id: string): Promise<Todo> {
  return request<Todo>(`${todoPath(id)}/complete`, { method: 'POST' });
}

export function incompleteTodo(id: string): Promise<Todo> {
  return request<Todo>(`${todoPath(id)}/incomplete`, { method: 'POST' });
}

export function deleteTodo(id: string): Promise<void> {
  return request<void>(todoPath(id), { method: 'DELETE' });
}

function todoPath(id: string): string {
  return `/todos/${encodeURIComponent(id)}`;
}
