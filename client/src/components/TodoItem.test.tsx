import type { Todo } from '@todo/shared';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { makeTodo } from '../test/make-todo';
import { TodoItem } from './TodoItem';

const TODAY = '2026-09-27';

function renderItem(todo: Todo, props: Partial<Parameters<typeof TodoItem>[0]> = {}) {
  const onToggleCompleted = vi.fn();
  render(
    <ul>
      <TodoItem todo={todo} today={TODAY} onToggleCompleted={onToggleCompleted} {...props} />
    </ul>,
  );
  return { onToggleCompleted };
}

describe('TodoItem', () => {
  it('shows the title, due date and completion status', () => {
    renderItem(makeTodo({ title: 'Pay rent', dueDate: '2026-10-01', isCompleted: true }));

    expect(screen.getByText('Pay rent')).toBeInTheDocument();
    expect(screen.getByText('2026-10-01')).toHaveAttribute('datetime', '2026-10-01');
    expect(screen.getByRole('checkbox', { name: 'Mark "Pay rent" as completed' })).toBeChecked();
  });

  it('omits the due date when there is none', () => {
    renderItem(makeTodo({ dueDate: null }));

    expect(screen.queryByText(/Due/)).not.toBeInTheDocument();
  });

  it.each([
    ['incomplete and due before today', { dueDate: '2026-09-26' }, true],
    ['due today', { dueDate: TODAY }, false],
    ['completed after its due date', { dueDate: '2026-09-01', isCompleted: true }, false],
    ['without a due date', { dueDate: null }, false],
  ])('%s: shows the overdue badge = %s', (_case, overrides, expected) => {
    renderItem(makeTodo(overrides));

    expect(screen.queryByText('Overdue') !== null).toBe(expected);
  });

  it('reports a checkbox click with the todo', async () => {
    const todo = makeTodo({ title: 'Buy milk' });
    const { onToggleCompleted } = renderItem(todo);

    await userEvent.click(screen.getByRole('checkbox', { name: 'Mark "Buy milk" as completed' }));

    expect(onToggleCompleted).toHaveBeenCalledWith(todo);
  });

  it('disables the checkbox while saving', () => {
    renderItem(makeTodo(), { isSaving: true });

    expect(screen.getByRole('checkbox')).toBeDisabled();
  });
});
