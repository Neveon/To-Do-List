import { z } from 'zod';

export const TODO_STATUS_FILTERS = ['all', 'completed', 'incomplete', 'overdue'] as const;
export const TODO_SORT_FIELDS = ['createdAt', 'dueDate', 'title'] as const;
export const SORT_ORDERS = ['asc', 'desc'] as const;

export type TodoStatusFilter = (typeof TODO_STATUS_FILTERS)[number];
export type TodoSortField = (typeof TODO_SORT_FIELDS)[number];
export type SortOrder = (typeof SORT_ORDERS)[number];

/**
 * Query string of `GET /todos`. Every parameter is optional; the defaults return all
 * todos in creation order. Unknown parameters are ignored.
 */
export const listTodosQuerySchema = z.object({
  status: z
    .enum(TODO_STATUS_FILTERS, {
      error: `status must be one of: ${TODO_STATUS_FILTERS.join(', ')}`,
    })
    .default('all'),
  sortBy: z
    .enum(TODO_SORT_FIELDS, { error: `sortBy must be one of: ${TODO_SORT_FIELDS.join(', ')}` })
    .default('createdAt'),
  order: z
    .enum(SORT_ORDERS, { error: `order must be one of: ${SORT_ORDERS.join(', ')}` })
    .default('asc'),
});

/** Query parameters a client may send. */
export type ListTodosQueryParams = z.input<typeof listTodosQuerySchema>;
/** Query after validation, with defaults applied. */
export type ListTodosQuery = z.output<typeof listTodosQuerySchema>;
