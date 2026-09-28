import type { Todo } from './todo.schema';

/** Formats a moment as a YYYY-MM-DD calendar date in the local time zone. */
export function toLocalDateString(date: Date): string {
  const year = String(date.getFullYear()).padStart(4, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * A todo is overdue when it is not completed and its due date is before `today`
 * (YYYY-MM-DD). A todo due today is not overdue yet.
 */
export function isOverdue(todo: Pick<Todo, 'isCompleted' | 'dueDate'>, today: string): boolean {
  return !todo.isCompleted && todo.dueDate !== null && todo.dueDate < today;
}
