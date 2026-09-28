import { toLocalDateString, type CreateTodoInput, type Todo } from '@todo/shared';
import { useState } from 'react';
import { completeTodo, createTodo, incompleteTodo } from '../api/todos';
import { TodoForm } from '../components/TodoForm';
import { TodoItem } from '../components/TodoItem';
import { useTodos } from '../hooks/useTodos';

export function TodoListPage() {
  const { data: todos, error, isLoading, reload } = useTodos();
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

      <section aria-labelledby="todo-list-heading">
        <h2 id="todo-list-heading">Tasks</h2>

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

        {todos?.length === 0 && <p>Nothing to do yet.</p>}

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
