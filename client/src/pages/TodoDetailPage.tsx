import { isOverdue, toLocalDateString, type CreateTodoInput, type Todo } from '@todo/shared';
import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { ApiError } from '../api/http';
import { completeTodo, deleteTodo, incompleteTodo, updateTodo } from '../api/todos';
import { TodoForm } from '../components/TodoForm';
import { useTodo } from '../hooks/useTodos';

export function TodoDetailPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const { data: todo, error, isLoading, reload } = useTodo(id);
  const [isEditing, setIsEditing] = useState(false);
  const [isBusy, setIsBusy] = useState(false);
  const [actionError, setActionError] = useState<string>();

  if (error instanceof ApiError && error.code === 'NOT_FOUND') {
    return (
      <section>
        <h2>Task not found</h2>
        <p>It may have been deleted.</p>
        <BackLink />
      </section>
    );
  }

  if (error) {
    return (
      <section>
        <div role="alert">
          <p>Could not load the task: {error.message}</p>
          <button type="button" onClick={reload}>
            Try again
          </button>
        </div>
        <BackLink />
      </section>
    );
  }

  if (isLoading && !todo) {
    return <p role="status">Loading task…</p>;
  }

  if (!todo) {
    return null;
  }

  /** Runs a change against the API, reporting failures without leaving the page. */
  async function run(action: () => Promise<void>, failureMessage: string) {
    setIsBusy(true);
    setActionError(undefined);
    try {
      await action();
    } catch (caught) {
      setActionError(`${failureMessage}: ${(caught as Error).message}`);
    } finally {
      setIsBusy(false);
    }
  }

  const save = async (input: CreateTodoInput) => {
    await updateTodo(todo.id, input);
    setIsEditing(false);
    reload();
  };

  function toggleCompleted(current: Todo) {
    void run(async () => {
      await (current.isCompleted ? incompleteTodo(current.id) : completeTodo(current.id));
      reload();
    }, 'Could not update the task');
  }

  function remove(current: Todo) {
    if (!window.confirm(`Delete "${current.title}"? This cannot be undone.`)) {
      return;
    }
    void run(async () => {
      await deleteTodo(current.id);
      await navigate('/');
    }, 'Could not delete the task');
  }

  return (
    <section className="todo-detail" aria-labelledby="todo-detail-heading">
      <BackLink />

      {isEditing ? (
        <>
          <h2 id="todo-detail-heading">Edit task</h2>
          <TodoForm
            initialValues={{
              title: todo.title,
              description: todo.description ?? '',
              dueDate: todo.dueDate ?? '',
            }}
            submitLabel="Save changes"
            onSubmit={save}
            onCancel={() => setIsEditing(false)}
          />
        </>
      ) : (
        <>
          <h2 id="todo-detail-heading">{todo.title}</h2>

          {actionError && <p role="alert">{actionError}</p>}

          <dl className="todo-detail__fields">
            <dt>Status</dt>
            <dd>
              {todo.isCompleted ? 'Completed' : 'Not completed'}
              {isOverdue(todo, toLocalDateString(new Date())) && (
                <span className="badge badge--overdue">Overdue</span>
              )}
            </dd>

            <dt>Description</dt>
            <dd className="todo-detail__description">{todo.description ?? 'No description'}</dd>

            <dt>Due date</dt>
            <dd>
              {todo.dueDate ? <time dateTime={todo.dueDate}>{todo.dueDate}</time> : 'No due date'}
            </dd>

            <dt>Created</dt>
            <dd>
              <time dateTime={todo.createdAt}>{new Date(todo.createdAt).toLocaleString()}</time>
            </dd>
          </dl>

          <div className="form-actions">
            <button type="button" disabled={isBusy} onClick={() => toggleCompleted(todo)}>
              {todo.isCompleted ? 'Mark as not completed' : 'Mark as completed'}
            </button>
            <button type="button" disabled={isBusy} onClick={() => setIsEditing(true)}>
              Edit
            </button>
            <button
              type="button"
              className="button--danger"
              disabled={isBusy}
              onClick={() => remove(todo)}
            >
              Delete
            </button>
          </div>
        </>
      )}
    </section>
  );
}

function BackLink() {
  return (
    <p>
      <Link to="/">← All tasks</Link>
    </p>
  );
}
