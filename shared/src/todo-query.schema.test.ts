import { describe, expect, it } from 'vitest';
import { listTodosQuerySchema } from './todo-query.schema';

describe('listTodosQuerySchema', () => {
  it('defaults to all todos in creation order', () => {
    expect(listTodosQuerySchema.parse({})).toEqual({
      status: 'all',
      sortBy: 'createdAt',
      order: 'asc',
    });
  });

  it('accepts every supported value', () => {
    expect(
      listTodosQuerySchema.parse({ status: 'overdue', sortBy: 'dueDate', order: 'desc' }),
    ).toEqual({ status: 'overdue', sortBy: 'dueDate', order: 'desc' });
  });

  it.each([
    ['status', 'done', 'status must be one of: all, completed, incomplete, overdue'],
    ['sortBy', 'priority', 'sortBy must be one of: createdAt, dueDate, title'],
    ['order', 'up', 'order must be one of: asc, desc'],
    ['status', '', 'status must be one of: all, completed, incomplete, overdue'],
  ])('rejects %s=%j with a helpful message', (key, value, message) => {
    const result = listTodosQuerySchema.safeParse({ [key]: value });

    expect(result.error?.issues).toEqual([expect.objectContaining({ path: [key], message })]);
  });

  it('rejects a parameter given more than once', () => {
    expect(listTodosQuerySchema.safeParse({ status: ['completed', 'overdue'] }).success).toBe(
      false,
    );
  });

  it('ignores unknown parameters', () => {
    expect(listTodosQuerySchema.parse({ page: '2' })).not.toHaveProperty('page');
  });
});
