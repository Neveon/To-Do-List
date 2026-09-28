import type { Todo } from '@todo/shared';
import { describe, expect, it } from 'vitest';
import { makeTodo } from '../../test/support/make-todo';
import { filterTodos, queryTodos, sortTodos } from './todo.query';

const TODAY = '2026-09-27';

function titles(todos: Todo[]): string[] {
  return todos.map((todo) => todo.title);
}

describe('filterTodos', () => {
  const done = makeTodo({ title: 'done', isCompleted: true, dueDate: '2026-01-01' });
  const open = makeTodo({ title: 'open' });
  const late = makeTodo({ title: 'late', dueDate: '2026-09-26' });
  const dueToday = makeTodo({ title: 'dueToday', dueDate: TODAY });
  const todos = [done, open, late, dueToday];

  it.each([
    ['all', ['done', 'open', 'late', 'dueToday']],
    ['completed', ['done']],
    ['incomplete', ['open', 'late', 'dueToday']],
    ['overdue', ['late']],
  ] as const)('keeps %s todos', (status, expected) => {
    expect(titles(filterTodos(todos, status, TODAY))).toEqual(expected);
  });
});

describe('sortTodos', () => {
  it('sorts by creation time in either order', () => {
    const todos = [
      makeTodo({ title: 'middle', createdAt: '2026-09-02T00:00:00.000Z' }),
      makeTodo({ title: 'newest', createdAt: '2026-09-03T00:00:00.000Z' }),
      makeTodo({ title: 'oldest', createdAt: '2026-09-01T00:00:00.000Z' }),
    ];

    expect(titles(sortTodos(todos, 'createdAt', 'asc'))).toEqual(['oldest', 'middle', 'newest']);
    expect(titles(sortTodos(todos, 'createdAt', 'desc'))).toEqual(['newest', 'middle', 'oldest']);
  });

  it('sorts titles case-insensitively with natural number order', () => {
    const todos = ['task 10', 'Banana', 'Task 2', 'apple'].map((title) => makeTodo({ title }));

    expect(titles(sortTodos(todos, 'title', 'asc'))).toEqual([
      'apple',
      'Banana',
      'Task 2',
      'task 10',
    ]);
    expect(titles(sortTodos(todos, 'title', 'desc'))).toEqual([
      'task 10',
      'Task 2',
      'Banana',
      'apple',
    ]);
  });

  it('sorts by due date and always puts todos without one last', () => {
    const todos = [
      makeTodo({ title: 'none-1', dueDate: null }),
      makeTodo({ title: 'december', dueDate: '2026-12-01' }),
      makeTodo({ title: 'none-2', dueDate: null }),
      makeTodo({ title: 'october', dueDate: '2026-10-01' }),
    ];

    expect(titles(sortTodos(todos, 'dueDate', 'asc'))).toEqual([
      'october',
      'december',
      'none-1',
      'none-2',
    ]);
    expect(titles(sortTodos(todos, 'dueDate', 'desc'))).toEqual([
      'december',
      'october',
      'none-1',
      'none-2',
    ]);
  });

  it('breaks ties by creation time, oldest first, regardless of order', () => {
    const todos = [
      makeTodo({ title: 'later', dueDate: '2026-10-01', createdAt: '2026-09-02T00:00:00.000Z' }),
      makeTodo({ title: 'earlier', dueDate: '2026-10-01', createdAt: '2026-09-01T00:00:00.000Z' }),
    ];

    expect(titles(sortTodos(todos, 'dueDate', 'asc'))).toEqual(['earlier', 'later']);
    expect(titles(sortTodos(todos, 'dueDate', 'desc'))).toEqual(['earlier', 'later']);
  });

  it('does not modify the input array', () => {
    const todos = [makeTodo({ title: 'b' }), makeTodo({ title: 'a' })];

    sortTodos(todos, 'title', 'asc');

    expect(titles(todos)).toEqual(['b', 'a']);
  });
});

describe('queryTodos', () => {
  it('filters and then sorts', () => {
    const todos = [
      makeTodo({ title: 'late-b', dueDate: '2026-09-20' }),
      makeTodo({ title: 'future', dueDate: '2026-12-01' }),
      makeTodo({ title: 'late-a', dueDate: '2026-09-10' }),
      makeTodo({ title: 'late-done', dueDate: '2026-09-01', isCompleted: true }),
    ];

    const result = queryTodos(todos, { status: 'overdue', sortBy: 'dueDate', order: 'asc' }, TODAY);

    expect(titles(result)).toEqual(['late-a', 'late-b']);
  });
});
