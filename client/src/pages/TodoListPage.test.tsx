import type { Todo } from '@todo/shared';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { makeTodo } from '../test/make-todo';
import { server } from '../test/server';
import { TodoListPage } from './TodoListPage';

/** A stateful fake of the list and completion endpoints, so toggles change what GET returns. */
function mockTodosApi(initial: Todo[]) {
  let todos = [...initial];
  const setCompleted =
    (isCompleted: boolean) =>
    ({ params }: { params: Record<string, string | readonly string[] | undefined> }) => {
      todos = todos.map((todo) => (todo.id === params.id ? { ...todo, isCompleted } : todo));
      return HttpResponse.json(todos.find((todo) => todo.id === params.id));
    };

  server.use(
    http.get('/api/todos', () => HttpResponse.json(todos)),
    http.post('/api/todos/:id/complete', setCompleted(true)),
    http.post('/api/todos/:id/incomplete', setCompleted(false)),
  );
}

describe('TodoListPage', () => {
  it('shows a loading message, then the todos', async () => {
    mockTodosApi([
      makeTodo({ title: 'Buy milk', dueDate: '2000-01-01' }),
      makeTodo({ title: 'Pay rent', dueDate: '2999-01-01', isCompleted: true }),
    ]);

    render(<TodoListPage />);

    expect(screen.getByRole('status')).toHaveTextContent('Loading tasks…');
    const items = await screen.findAllByRole('listitem');
    expect(items).toHaveLength(2);
    expect(within(items[0]!).getByText('Buy milk')).toBeInTheDocument();
    expect(within(items[0]!).getByText('Overdue')).toBeInTheDocument();
    expect(within(items[1]!).getByRole('checkbox')).toBeChecked();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('shows an empty state when there are no todos', async () => {
    mockTodosApi([]);

    render(<TodoListPage />);

    expect(await screen.findByText('Nothing to do yet.')).toBeInTheDocument();
    expect(screen.queryByRole('list')).not.toBeInTheDocument();
  });

  it('shows an error with a retry button when loading fails', async () => {
    let attempts = 0;
    server.use(
      http.get('/api/todos', () => {
        attempts += 1;
        return attempts === 1
          ? HttpResponse.json(
              { error: { code: 'INTERNAL_ERROR', message: 'Boom' } },
              { status: 500 },
            )
          : HttpResponse.json([makeTodo({ title: 'Recovered' })]);
      }),
    );
    render(<TodoListPage />);

    expect(await screen.findByRole('alert')).toHaveTextContent('Could not load tasks: Boom');
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));

    expect(await screen.findByText('Recovered')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('marks an incomplete todo as completed', async () => {
    mockTodosApi([makeTodo({ title: 'Buy milk' })]);
    render(<TodoListPage />);
    const checkbox = await screen.findByRole('checkbox', { name: 'Mark "Buy milk" as completed' });

    await userEvent.click(checkbox);

    await waitFor(() => expect(checkbox).toBeChecked());
  });

  it('marks a completed todo as not completed', async () => {
    mockTodosApi([makeTodo({ title: 'Buy milk', isCompleted: true })]);
    render(<TodoListPage />);
    const checkbox = await screen.findByRole('checkbox', { name: 'Mark "Buy milk" as completed' });

    await userEvent.click(checkbox);

    await waitFor(() => expect(checkbox).not.toBeChecked());
  });

  it('shows an error and keeps the todo unchanged when saving fails', async () => {
    mockTodosApi([makeTodo({ id: 'todo-1', title: 'Buy milk' })]);
    server.use(
      http.post('/api/todos/:id/complete', () =>
        HttpResponse.json({ error: { code: 'NOT_FOUND', message: 'Gone' } }, { status: 404 }),
      ),
    );
    render(<TodoListPage />);
    const checkbox = await screen.findByRole('checkbox', { name: 'Mark "Buy milk" as completed' });

    await userEvent.click(checkbox);

    expect(await screen.findByRole('alert')).toHaveTextContent('Could not update "Buy milk": Gone');
    expect(checkbox).not.toBeChecked();
    expect(checkbox).toBeEnabled();
  });
});
