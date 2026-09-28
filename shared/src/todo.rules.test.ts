import { describe, expect, it } from 'vitest';
import { isOverdue, toLocalDateString } from './todo.rules';

describe('toLocalDateString', () => {
  it('formats the local calendar date as YYYY-MM-DD', () => {
    expect(toLocalDateString(new Date(2026, 8, 7, 23, 59))).toBe('2026-09-07');
    expect(toLocalDateString(new Date(2026, 11, 31, 0, 0))).toBe('2026-12-31');
  });
});

describe('isOverdue', () => {
  const today = '2026-09-27';

  it('is true for an incomplete todo due before today', () => {
    expect(isOverdue({ isCompleted: false, dueDate: '2026-09-26' }, today)).toBe(true);
  });

  it('is false for a todo due today', () => {
    expect(isOverdue({ isCompleted: false, dueDate: today }, today)).toBe(false);
  });

  it('is false for a todo due in the future', () => {
    expect(isOverdue({ isCompleted: false, dueDate: '2026-10-01' }, today)).toBe(false);
  });

  it('is false for a completed todo, even if its due date has passed', () => {
    expect(isOverdue({ isCompleted: true, dueDate: '2026-01-01' }, today)).toBe(false);
  });

  it('is false for a todo without a due date', () => {
    expect(isOverdue({ isCompleted: false, dueDate: null }, today)).toBe(false);
  });

  it('compares across month and year boundaries', () => {
    expect(isOverdue({ isCompleted: false, dueDate: '2025-12-31' }, '2026-01-01')).toBe(true);
    expect(isOverdue({ isCompleted: false, dueDate: '2026-09-30' }, '2026-10-01')).toBe(true);
  });
});
