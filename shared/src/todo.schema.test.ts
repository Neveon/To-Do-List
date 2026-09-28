import { describe, expect, it } from 'vitest';
import type { z } from 'zod';
import {
  DESCRIPTION_MAX_LENGTH,
  TITLE_MAX_LENGTH,
  createTodoSchema,
  todoSchema,
  updateTodoSchema,
} from './todo.schema';

function issuesOf(result: z.ZodSafeParseResult<unknown>) {
  return result.success ? [] : result.error.issues.map(({ path, message }) => ({ path, message }));
}

describe('createTodoSchema', () => {
  it('accepts a title only and defaults optional fields to null', () => {
    expect(createTodoSchema.parse({ title: 'Buy milk' })).toEqual({
      title: 'Buy milk',
      description: null,
      dueDate: null,
    });
  });

  it('accepts all fields', () => {
    const input = { title: 'Pay rent', description: 'Transfer to landlord', dueDate: '2026-10-01' };

    expect(createTodoSchema.parse(input)).toEqual(input);
  });

  it('trims the title and description', () => {
    expect(createTodoSchema.parse({ title: '  Buy milk ', description: ' 2L ' })).toMatchObject({
      title: 'Buy milk',
      description: '2L',
    });
  });

  it.each([
    ['missing', {}],
    ['empty', { title: '' }],
    ['whitespace only', { title: '   ' }],
  ])('rejects a %s title', (_case, input) => {
    const result = createTodoSchema.safeParse(input);

    expect(result.success).toBe(false);
    expect(issuesOf(result)[0]?.path).toEqual(['title']);
  });

  it('rejects a non-string title', () => {
    expect(issuesOf(createTodoSchema.safeParse({ title: 42 }))).toEqual([
      { path: ['title'], message: 'Title must be a string' },
    ]);
  });

  it(`accepts a title of exactly ${TITLE_MAX_LENGTH} characters and rejects one longer`, () => {
    expect(createTodoSchema.safeParse({ title: 'a'.repeat(TITLE_MAX_LENGTH) }).success).toBe(true);
    expect(createTodoSchema.safeParse({ title: 'a'.repeat(TITLE_MAX_LENGTH + 1) }).success).toBe(
      false,
    );
  });

  it(`rejects a description longer than ${DESCRIPTION_MAX_LENGTH} characters`, () => {
    const result = createTodoSchema.safeParse({
      title: 'Write report',
      description: 'a'.repeat(DESCRIPTION_MAX_LENGTH + 1),
    });

    expect(issuesOf(result)[0]?.path).toEqual(['description']);
  });

  it.each(['', '   ', null])('normalizes a blank description (%j) to null', (description) => {
    expect(createTodoSchema.parse({ title: 'Buy milk', description }).description).toBeNull();
  });

  it.each(['2026-10-01', '2028-02-29'])('accepts the valid due date %s', (dueDate) => {
    expect(createTodoSchema.parse({ title: 'Buy milk', dueDate }).dueDate).toBe(dueDate);
  });

  it.each([
    ['wrong separator', '2026/10/01'],
    ['missing zero padding', '2026-1-5'],
    ['datetime instead of date', '2026-10-01T00:00:00Z'],
    ['non-existent day', '2026-02-30'],
    ['non-existent month', '2026-13-01'],
    ['Feb 29 in a non-leap year', '2027-02-29'],
    ['free text', 'tomorrow'],
  ])('rejects a due date with %s (%s)', (_case, dueDate) => {
    expect(issuesOf(createTodoSchema.safeParse({ title: 'Buy milk', dueDate }))).toEqual([
      { path: ['dueDate'], message: 'Due date must be a valid date in YYYY-MM-DD format' },
    ]);
  });

  it.each(['id', 'createdAt', 'isCompleted', 'priority'])(
    'rejects the unknown or server-owned field %s',
    (field) => {
      const result = createTodoSchema.safeParse({ title: 'Buy milk', [field]: 'x' });

      expect(result.success).toBe(false);
    },
  );
});

describe('updateTodoSchema', () => {
  it.each([{ title: 'New title' }, { description: 'More detail' }, { dueDate: '2026-12-31' }])(
    'accepts a single-field update %j',
    (changes) => {
      expect(updateTodoSchema.parse(changes)).toEqual(changes);
    },
  );

  it('leaves omitted fields out of the result so they are not overwritten', () => {
    expect(updateTodoSchema.parse({ title: 'New title' })).not.toHaveProperty('description');
  });

  it('rejects an empty update', () => {
    expect(issuesOf(updateTodoSchema.safeParse({}))).toEqual([
      { path: [], message: 'At least one of title, description or dueDate must be provided' },
    ]);
  });

  it('allows clearing optional fields with null', () => {
    expect(updateTodoSchema.parse({ description: null, dueDate: null })).toEqual({
      description: null,
      dueDate: null,
    });
  });

  it('rejects clearing the title', () => {
    expect(updateTodoSchema.safeParse({ title: null }).success).toBe(false);
    expect(updateTodoSchema.safeParse({ title: '  ' }).success).toBe(false);
  });

  it('applies the same validation rules as create', () => {
    expect(updateTodoSchema.safeParse({ dueDate: '2026-02-30' }).success).toBe(false);
  });

  it('rejects isCompleted, which has dedicated complete/incomplete operations', () => {
    expect(updateTodoSchema.safeParse({ isCompleted: true }).success).toBe(false);
  });
});

describe('todoSchema', () => {
  const todo = {
    id: '5b0f7c1e-2d4a-4c8e-9f3b-1a2b3c4d5e6f',
    title: 'Buy milk',
    description: null,
    dueDate: '2026-10-01',
    isCompleted: false,
    createdAt: '2026-09-27T12:00:00.000Z',
  };

  it('accepts a complete todo', () => {
    expect(todoSchema.parse(todo)).toEqual(todo);
  });

  it.each(Object.keys(todo))('rejects a todo missing %s', (field) => {
    const { [field as keyof typeof todo]: _omitted, ...incomplete } = todo;

    expect(todoSchema.safeParse(incomplete).success).toBe(false);
  });
});
