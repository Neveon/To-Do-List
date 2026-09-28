import {
  isOverdue,
  type ListTodosQuery,
  type SortOrder,
  type Todo,
  type TodoSortField,
  type TodoStatusFilter,
} from '@todo/shared';

const titleCollator = new Intl.Collator('en', { sensitivity: 'base', numeric: true });

/** Keeps the todos matching `status`; "overdue" is judged against `today` (YYYY-MM-DD). */
export function filterTodos(todos: Todo[], status: TodoStatusFilter, today: string): Todo[] {
  switch (status) {
    case 'all':
      return todos;
    case 'completed':
      return todos.filter((todo) => todo.isCompleted);
    case 'incomplete':
      return todos.filter((todo) => !todo.isCompleted);
    case 'overdue':
      return todos.filter((todo) => isOverdue(todo, today));
  }
}

/**
 * Returns a sorted copy. Titles compare case-insensitively with natural number order
 * ("Task 2" before "Task 10"). Todos without a due date always come last when sorting
 * by due date. Ties are broken by creation time, oldest first, so the order is stable.
 */
export function sortTodos(todos: Todo[], sortBy: TodoSortField, order: SortOrder): Todo[] {
  const direction = order === 'asc' ? 1 : -1;

  return [...todos].sort((a, b) => {
    if (sortBy === 'dueDate' && a.dueDate !== b.dueDate) {
      if (a.dueDate === null) return 1;
      if (b.dueDate === null) return -1;
    }
    return direction * compareBy(sortBy, a, b) || compareStrings(a.createdAt, b.createdAt);
  });
}

export function queryTodos(todos: Todo[], query: ListTodosQuery, today: string): Todo[] {
  return sortTodos(filterTodos(todos, query.status, today), query.sortBy, query.order);
}

function compareBy(field: TodoSortField, a: Todo, b: Todo): number {
  switch (field) {
    case 'title':
      return titleCollator.compare(a.title, b.title);
    case 'dueDate':
      // Both are non-null or equal here; nulls were ordered by the caller.
      return compareStrings(a.dueDate ?? '', b.dueDate ?? '');
    case 'createdAt':
      return compareStrings(a.createdAt, b.createdAt);
  }
}

/** ISO dates and timestamps sort correctly as plain strings. */
function compareStrings(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}
