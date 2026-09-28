import type { Todo } from '@todo/shared';

let sequence = 0;

/** Builds a valid todo for tests; override only the fields a test cares about. */
export function makeTodo(overrides: Partial<Todo> = {}): Todo {
  sequence += 1;
  return {
    id: `todo-${sequence}`,
    title: `Todo ${sequence}`,
    description: null,
    dueDate: null,
    isCompleted: false,
    createdAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}
