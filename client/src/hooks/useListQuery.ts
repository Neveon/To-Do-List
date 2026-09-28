import {
  SORT_ORDERS,
  TODO_SORT_FIELDS,
  TODO_STATUS_FILTERS,
  listTodosQuerySchema,
  type ListTodosQuery,
} from '@todo/shared';
import { useCallback } from 'react';
import { useSearchParams } from 'react-router';

export const DEFAULT_LIST_QUERY: ListTodosQuery = listTodosQuerySchema.parse({});

/** Reads the list query from URL search params; missing or unknown values fall back to defaults. */
export function readListQuery(params: URLSearchParams): ListTodosQuery {
  return {
    status: pick(params.get('status'), TODO_STATUS_FILTERS, DEFAULT_LIST_QUERY.status),
    sortBy: pick(params.get('sortBy'), TODO_SORT_FIELDS, DEFAULT_LIST_QUERY.sortBy),
    order: pick(params.get('order'), SORT_ORDERS, DEFAULT_LIST_QUERY.order),
  };
}

/** Writes the list query to search params, leaving out defaults to keep URLs short. */
export function toSearchParams(query: ListTodosQuery): URLSearchParams {
  const params = new URLSearchParams();
  for (const key of ['status', 'sortBy', 'order'] as const) {
    if (query[key] !== DEFAULT_LIST_QUERY[key]) {
      params.set(key, query[key]);
    }
  }
  return params;
}

/**
 * The list's filter and sort, stored in the URL so the view survives a refresh
 * and can be bookmarked or shared.
 */
export function useListQuery(): [ListTodosQuery, (changes: Partial<ListTodosQuery>) => void] {
  const [searchParams, setSearchParams] = useSearchParams();
  const query = readListQuery(searchParams);

  const updateQuery = useCallback(
    (changes: Partial<ListTodosQuery>) => {
      setSearchParams((current) => toSearchParams({ ...readListQuery(current), ...changes }), {
        replace: true,
      });
    },
    [setSearchParams],
  );

  return [query, updateQuery];
}

function pick<T extends string>(value: string | null, allowed: readonly T[], fallback: T): T {
  return allowed.find((candidate) => candidate === value) ?? fallback;
}
