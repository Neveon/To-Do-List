import { toLocalDateString, type CreateTodoInput, type Todo } from '@todo/shared';
import { useState } from 'react';
import { completeTodo, createTodo, incompleteTodo } from '../api/todos';
import { TodoForm } from '../components/TodoForm';
import { TodoItem } from '../components/TodoItem';
import { TodoListControls } from '../components/TodoListControls';
import { DEFAULT_LIST_QUERY, useListQuery } from '../hooks/useListQuery';
import { useTodos } from '../hooks/useTodos';

export function TodoListPage() {
  const [query, updateQuery] = useListQuery();
  const { data: todos, error, isLoading, reload } = useTodos(query);
  const [savingId, setSavingId] = useState<string>();
  const [actionError, setActionError] = useState<string>();
  const today = toLocalDateString(new Date());

  async function addTodo(input: CreateTodoInput) {
    await createTodo(input);
    reload();
  }

  async function toggleCompleted(todo: Todo) {
    setSavingId(todo.id);
    setActionError(undefined);
    try {
      await (todo.isCompleted ? incompleteTodo(todo.id) : completeTodo(todo.id));
      reload();
    } catch (caught) {
      setActionError(`Could not update "${todo.title}": ${(caught as Error).message}`);
    } finally {
      setSavingId(undefined);
    }
  }

  return (
    <>
      <section aria-labelledby="new-todo-heading">
        <h2 id="new-todo-heading">New task</h2>
        <TodoForm submitLabel="Add task" onSubmit={addTodo} resetOnSuccess />
      </section>

      <section aria-labelledby="todo-list-heading" aria-busy={isLoading}>
        <h2 id="todo-list-heading">Tasks</h2>

        <TodoListControls query={query} onChange={updateQuery} />

        {actionError && <p role="alert">{actionError}</p>}

        {error && (
          <div role="alert">
            <p>Could not load tasks: {error.message}</p>
            <button type="button" onClick={reload}>
              Try again
            </button>
          </div>
        )}

        {isLoading && !todos && <p role="status">Loading tasks…</p>}

        {todos?.length === 0 && (
          <p>
            {query.status === DEFAULT_LIST_QUERY.status
              ? 'Nothing to do yet.'
              : 'No tasks match this filter.'}
          </p>
        )}

        {todos && todos.length > 0 && (
          <ul className="todo-list">
            {todos.map((todo) => (
              <TodoItem
                key={todo.id}
                todo={todo}
                today={today}
                onToggleCompleted={(target) => void toggleCompleted(target)}
                isSaving={savingId === todo.id}
              />
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
