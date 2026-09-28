import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { App } from './App';
import { makeTodo } from './test/make-todo';
import { renderWithRouter } from './test/render';
import { server } from './test/server';

describe('App', () => {
  it('shows the task list at /', async () => {
    server.use(http.get('/api/todos', () => HttpResponse.json([])));

    renderWithRouter(<App />);

    expect(screen.getByRole('heading', { level: 1, name: 'To-Do List' })).toBeInTheDocument();
    expect(await screen.findByText('Nothing to do yet.')).toBeInTheDocument();
  });

  it('navigates from the list to a task and back', async () => {
    const todo = makeTodo({ id: 'todo-1', title: 'Buy milk' });
    server.use(
      http.get('/api/todos', () => HttpResponse.json([todo])),
      http.get('/api/todos/todo-1', () => HttpResponse.json(todo)),
    );
    const user = userEvent.setup();
    renderWithRouter(<App />);

    await user.click(await screen.findByRole('link', { name: 'Buy milk' }));
    expect(await screen.findByRole('heading', { level: 2, name: 'Buy milk' })).toBeInTheDocument();

    await user.click(screen.getByRole('link', { name: '← All tasks' }));
    expect(await screen.findByRole('heading', { level: 2, name: 'Tasks' })).toBeInTheDocument();
  });

  it('shows a not-found page for unknown routes', () => {
    renderWithRouter(<App />, { route: '/nowhere' });

    expect(screen.getByRole('heading', { name: 'Page not found' })).toBeInTheDocument();
  });
});
