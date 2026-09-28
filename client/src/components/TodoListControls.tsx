import type { ListTodosQuery, SortOrder, TodoSortField, TodoStatusFilter } from '@todo/shared';
import { useId } from 'react';

const STATUS_LABELS: Record<TodoStatusFilter, string> = {
  all: 'All',
  incomplete: 'Incomplete',
  completed: 'Completed',
  overdue: 'Overdue',
};

const SORT_FIELD_LABELS: Record<TodoSortField, string> = {
  createdAt: 'Date created',
  dueDate: 'Due date',
  title: 'Title',
};

const ORDER_LABELS: Record<SortOrder, string> = {
  asc: 'Ascending',
  desc: 'Descending',
};

interface TodoListControlsProps {
  query: ListTodosQuery;
  onChange: (changes: Partial<ListTodosQuery>) => void;
}

export function TodoListControls({ query, onChange }: TodoListControlsProps) {
  const id = useId();

  return (
    <div className="list-controls">
      <div className="field">
        <label htmlFor={`${id}-status`}>Show</label>
        <select
          id={`${id}-status`}
          value={query.status}
          onChange={(event) => onChange({ status: event.target.value as TodoStatusFilter })}
        >
          {options(STATUS_LABELS)}
        </select>
      </div>

      <div className="field">
        <label htmlFor={`${id}-sortBy`}>Sort by</label>
        <select
          id={`${id}-sortBy`}
          value={query.sortBy}
          onChange={(event) => onChange({ sortBy: event.target.value as TodoSortField })}
        >
          {options(SORT_FIELD_LABELS)}
        </select>
      </div>

      <div className="field">
        <label htmlFor={`${id}-order`}>Order</label>
        <select
          id={`${id}-order`}
          value={query.order}
          onChange={(event) => onChange({ order: event.target.value as SortOrder })}
        >
          {options(ORDER_LABELS)}
        </select>
      </div>
    </div>
  );
}

function options(labels: Record<string, string>) {
  return Object.entries(labels).map(([value, label]) => (
    <option key={value} value={value}>
      {label}
    </option>
  ));
}
