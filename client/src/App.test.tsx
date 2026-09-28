import { render, screen } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { App } from './App';
import { server } from './test/server';

describe('App', () => {
  it('renders the application heading and the task list', async () => {
    server.use(http.get('/api/todos', () => HttpResponse.json([])));

    render(<App />);

    expect(screen.getByRole('heading', { level: 1, name: 'To-Do List' })).toBeInTheDocument();
    expect(await screen.findByText('Nothing to do yet.')).toBeInTheDocument();
  });
});
