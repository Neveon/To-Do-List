import type { Todo } from '@todo/shared';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { MemoryRouter, Route, Routes } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { makeTodo } from '../test/make-todo';
import { server } from '../test/server';
import { TodoDetailPage } from './TodoDetailPage';

/** A stateful fake of the single-todo endpoints that records what was sent. */
function mockTodoApi(initial: Todo) {
  let todo: Todo | undefined = { ...initial };
  const sent: { method: string; path: string; body?: unknown }[] = [];
  const path = `/api/todos/${initial.id}`;
  const notFound = () =>
    HttpResponse.json({ error: { code: 'NOT_FOUND', message: 'Not found' } }, { status: 404 });

  server.use(
    http.get(path, () => (todo ? HttpResponse.json(todo) : notFound())),
    http.patch(path, async ({ request }) => {
      const body = (await request.json()) as Partial<Todo>;
      sent.push({ method: 'PATCH', path, body });
      todo = { ...todo!, ...body };
      return HttpResponse.json(todo);
    }),
    http.post(`${path}/:action`, ({ params }) => {
      sent.push({ method: 'POST', path: `${path}/${String(params.action)}` });
      todo = { ...todo!, isCompleted: params.action === 'complete' };
      return HttpResponse.json(todo);
    }),
    http.delete(path, () => {
      sent.push({ method: 'DELETE', path });
      todo = undefined;
      return new HttpResponse(null, { status: 204 });
    }),
  );
  return { sent };
}

function renderDetailPage(id = 'todo-1') {
  const user = userEvent.setup();
  render(
    <MemoryRouter initialEntries={[`/todos/${id}`]}>
      <Routes>
        <Route path="/" element={<p>List page</p>} />
        <Route path="/todos/:id" element={<TodoDetailPage />} />
      </Routes>
    </MemoryRouter>,
  );
  return { user };
}

function field(name: string) {
  return screen.getByText(name, { selector: 'dt' }).nextElementSibling;
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('TodoDetailPage', () => {
  it('shows every detail of the task', async () => {
    const todo = makeTodo({
      id: 'todo-1',
      title: 'Pay rent',
      description: 'Transfer to landlord',
      dueDate: '2999-10-01',
      createdAt: '2026-09-27T12:00:00.000Z',
    });
    mockTodoApi(todo);

    renderDetailPage();

    expect(screen.getByRole('status')).toHaveTextContent('Loading task…');
    expect(await screen.findByRole('heading', { name: 'Pay rent' })).toBeInTheDocument();
    expect(field('Status')).toHaveTextContent('Not completed');
    expect(field('Description')).toHaveTextContent('Transfer to landlord');
    expect(field('Due date')).toHaveTextContent('2999-10-01');
    expect(field('Created')).toHaveTextContent(new Date(todo.createdAt).toLocaleString());
  });

  it('shows placeholders for missing optional fields and flags overdue tasks', async () => {
    mockTodoApi(makeTodo({ id: 'todo-1', description: null, dueDate: null }));
    renderDetailPage();

    expect(await screen.findByText('No description')).toBeInTheDocument();
    expect(field('Due date')).toHaveTextContent('No due date');
    expect(screen.queryByText('Overdue')).not.toBeInTheDocument();
  });

  it('flags an overdue task', async () => {
    mockTodoApi(makeTodo({ id: 'todo-1', dueDate: '2000-01-01' }));
    renderDetailPage();

    expect(await screen.findByText('Overdue')).toBeInTheDocument();
  });

  it('shows a not-found message for an unknown id', async () => {
    server.use(
      http.get('/api/todos/:id', () =>
        HttpResponse.json({ error: { code: 'NOT_FOUND', message: 'Not found' } }, { status: 404 }),
      ),
    );
    renderDetailPage('missing');

    expect(await screen.findByRole('heading', { name: 'Task not found' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '← All tasks' })).toHaveAttribute('href', '/');
  });

  it('shows other load failures with a retry button', async () => {
    let attempts = 0;
    const todo = makeTodo({ id: 'todo-1', title: 'Recovered' });
    server.use(
      http.get('/api/todos/todo-1', () => {
        attempts += 1;
        return attempts === 1
          ? HttpResponse.json(
              { error: { code: 'INTERNAL_ERROR', message: 'Boom' } },
              { status: 500 },
            )
          : HttpResponse.json(todo);
      }),
    );
    const { user } = renderDetailPage();

    expect(await screen.findByRole('alert')).toHaveTextContent('Could not load the task: Boom');
    await user.click(screen.getByRole('button', { name: 'Try again' }));

    expect(await screen.findByRole('heading', { name: 'Recovered' })).toBeInTheDocument();
  });

  describe('editing', () => {
    it('saves changes and shows the updated task', async () => {
      const { sent } = mockTodoApi(
        makeTodo({ id: 'todo-1', title: 'Old', description: 'Keep', dueDate: '2999-01-01' }),
      );
      const { user } = renderDetailPage();
      await user.click(await screen.findByRole('button', { name: 'Edit' }));

      expect(screen.getByLabelText('Title')).toHaveValue('Old');
      expect(screen.getByLabelText('Description (optional)')).toHaveValue('Keep');
      await user.clear(screen.getByLabelText('Title'));
      await user.type(screen.getByLabelText('Title'), 'New');
      await user.clear(screen.getByLabelText('Due date (optional)'));
      await user.click(screen.getByRole('button', { name: 'Save changes' }));

      expect(await screen.findByRole('heading', { name: 'New' })).toBeInTheDocument();
      expect(field('Due date')).toHaveTextContent('No due date');
      expect(sent).toEqual([
        {
          method: 'PATCH',
          path: '/api/todos/todo-1',
          body: { title: 'New', description: 'Keep', dueDate: null },
        },
      ]);
    });

    it('discards changes on cancel', async () => {
      const { sent } = mockTodoApi(makeTodo({ id: 'todo-1', title: 'Original' }));
      const { user } = renderDetailPage();
      await user.click(await screen.findByRole('button', { name: 'Edit' }));

      await user.type(screen.getByLabelText('Title'), ' changed');
      await user.click(screen.getByRole('button', { name: 'Cancel' }));

      expect(screen.getByRole('heading', { name: 'Original' })).toBeInTheDocument();
      expect(sent).toEqual([]);
    });

    it('stays in the form and shows the error when saving fails', async () => {
      mockTodoApi(makeTodo({ id: 'todo-1', title: 'Original' }));
      server.use(
        http.patch('/api/todos/todo-1', () =>
          HttpResponse.json({ error: { code: 'NOT_FOUND', message: 'Gone' } }, { status: 404 }),
        ),
      );
      const { user } = renderDetailPage();
      await user.click(await screen.findByRole('button', { name: 'Edit' }));

      await user.click(screen.getByRole('button', { name: 'Save changes' }));

      expect(await screen.findByRole('alert')).toHaveTextContent('Gone');
      expect(screen.getByLabelText('Title')).toHaveValue('Original');
    });
  });

  it('marks the task as completed and back again', async () => {
    const { sent } = mockTodoApi(makeTodo({ id: 'todo-1' }));
    const { user } = renderDetailPage();

    await user.click(await screen.findByRole('button', { name: 'Mark as completed' }));
    expect(await screen.findByRole('button', { name: 'Mark as not completed' })).toBeEnabled();
    expect(field('Status')).toHaveTextContent('Completed');

    await user.click(screen.getByRole('button', { name: 'Mark as not completed' }));
    expect(await screen.findByRole('button', { name: 'Mark as completed' })).toBeEnabled();

    expect(sent.map((request) => request.path)).toEqual([
      '/api/todos/todo-1/complete',
      '/api/todos/todo-1/incomplete',
    ]);
  });

  describe('deleting', () => {
    it('deletes after confirmation and returns to the list', async () => {
      const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true);
      const { sent } = mockTodoApi(makeTodo({ id: 'todo-1', title: 'Buy milk' }));
      const { user } = renderDetailPage();

      await user.click(await screen.findByRole('button', { name: 'Delete' }));

      expect(confirm).toHaveBeenCalledWith('Delete "Buy milk"? This cannot be undone.');
      expect(await screen.findByText('List page')).toBeInTheDocument();
      expect(sent).toEqual([{ method: 'DELETE', path: '/api/todos/todo-1' }]);
    });

    it('does nothing when the confirmation is declined', async () => {
      vi.spyOn(window, 'confirm').mockReturnValue(false);
      const { sent } = mockTodoApi(makeTodo({ id: 'todo-1', title: 'Buy milk' }));
      const { user } = renderDetailPage();

      await user.click(await screen.findByRole('button', { name: 'Delete' }));

      expect(screen.getByRole('heading', { name: 'Buy milk' })).toBeInTheDocument();
      expect(sent).toEqual([]);
    });

    it('stays on the page and shows an error when deleting fails', async () => {
      vi.spyOn(window, 'confirm').mockReturnValue(true);
      mockTodoApi(makeTodo({ id: 'todo-1', title: 'Buy milk' }));
      server.use(
        http.delete('/api/todos/todo-1', () =>
          HttpResponse.json(
            { error: { code: 'INTERNAL_ERROR', message: 'Boom' } },
            { status: 500 },
          ),
        ),
      );
      const { user } = renderDetailPage();

      await user.click(await screen.findByRole('button', { name: 'Delete' }));

      expect(await screen.findByRole('alert')).toHaveTextContent('Could not delete the task: Boom');
      expect(screen.getByRole('heading', { name: 'Buy milk' })).toBeInTheDocument();
    });
  });
});
