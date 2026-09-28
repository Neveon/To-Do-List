import { TITLE_MAX_LENGTH } from '@todo/shared';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ApiError } from '../api/http';
import { TodoForm, type TodoFormValues } from './TodoForm';

function renderForm(props: Partial<Parameters<typeof TodoForm>[0]> = {}) {
  const onSubmit = vi.fn<(input: unknown) => Promise<void>>().mockResolvedValue(undefined);
  const user = userEvent.setup();
  render(<TodoForm submitLabel="Add task" onSubmit={onSubmit} {...props} />);
  return {
    user,
    onSubmit: (props.onSubmit as typeof onSubmit | undefined) ?? onSubmit,
    title: screen.getByLabelText('Title'),
    description: screen.getByLabelText('Description (optional)'),
    dueDate: screen.getByLabelText('Due date (optional)'),
    submit: () => user.click(screen.getByRole('button', { name: 'Add task' })),
  };
}

describe('TodoForm', () => {
  it('submits trimmed input with empty optional fields as null', async () => {
    const { user, onSubmit, title, submit } = renderForm();

    await user.type(title, '  Buy milk  ');
    await submit();

    expect(onSubmit).toHaveBeenCalledWith({ title: 'Buy milk', description: null, dueDate: null });
  });

  it('submits every field', async () => {
    const { user, onSubmit, title, description, dueDate, submit } = renderForm();

    await user.type(title, 'Pay rent');
    await user.type(description, 'Transfer to landlord');
    await user.type(dueDate, '2026-10-01');
    await submit();

    expect(onSubmit).toHaveBeenCalledWith({
      title: 'Pay rent',
      description: 'Transfer to landlord',
      dueDate: '2026-10-01',
    });
  });

  it('shows a field error and does not submit when the title is missing', async () => {
    const { onSubmit, title, submit } = renderForm();

    await submit();

    expect(onSubmit).not.toHaveBeenCalled();
    expect(title).toHaveAttribute('aria-invalid', 'true');
    expect(title).toHaveAccessibleDescription('Title is required');
  });

  it('applies the shared length limits', async () => {
    const { user, onSubmit, title, submit } = renderForm();

    await user.click(title);
    await user.paste('a'.repeat(TITLE_MAX_LENGTH + 1));
    await submit();

    expect(onSubmit).not.toHaveBeenCalled();
    expect(title).toHaveAccessibleDescription(
      `Title must be at most ${TITLE_MAX_LENGTH} characters`,
    );
  });

  it('clears a field error once the input is fixed and resubmitted', async () => {
    const { user, onSubmit, title, submit } = renderForm();
    await submit();

    await user.type(title, 'Buy milk');
    await submit();

    expect(onSubmit).toHaveBeenCalledOnce();
    expect(title).not.toHaveAttribute('aria-invalid');
  });

  it('shows server-side field errors on the matching input', async () => {
    const onSubmit = vi
      .fn()
      .mockRejectedValue(
        new ApiError(400, 'VALIDATION_ERROR', 'Request validation failed', [
          { path: 'dueDate', message: 'Due date must be a valid date in YYYY-MM-DD format' },
        ]),
      );
    const { user, title, dueDate, submit } = renderForm({ onSubmit });

    await user.type(title, 'Buy milk');
    await submit();

    expect(dueDate).toHaveAccessibleDescription(
      'Due date must be a valid date in YYYY-MM-DD format',
    );
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('shows other failures as a form-level alert and keeps the input', async () => {
    const onSubmit = vi
      .fn()
      .mockRejectedValue(new ApiError(0, 'NETWORK_ERROR', 'Could not reach the server.'));
    const { user, title, submit } = renderForm({ onSubmit });

    await user.type(title, 'Buy milk');
    await submit();

    expect(await screen.findByRole('alert')).toHaveTextContent('Could not reach the server.');
    expect(title).toHaveValue('Buy milk');
  });

  it('disables the submit button while saving', async () => {
    let finish: () => void = () => undefined;
    const onSubmit = vi.fn(() => new Promise<void>((resolve) => (finish = resolve)));
    const { user, title, submit } = renderForm({ onSubmit });
    await user.type(title, 'Buy milk');

    await submit();

    expect(screen.getByRole('button', { name: 'Saving…' })).toBeDisabled();
    finish();
    expect(await screen.findByRole('button', { name: 'Add task' })).toBeEnabled();
  });

  it('clears the fields after success when resetOnSuccess is set', async () => {
    const { user, title, dueDate, submit } = renderForm({ resetOnSuccess: true });

    await user.type(title, 'Buy milk');
    await user.type(dueDate, '2026-10-01');
    await submit();

    expect(title).toHaveValue('');
    expect(dueDate).toHaveValue('');
  });

  it('starts from the given initial values', () => {
    const initialValues: TodoFormValues = {
      title: 'Pay rent',
      description: 'Transfer',
      dueDate: '2026-10-01',
    };

    const { title, description, dueDate } = renderForm({ initialValues });

    expect(title).toHaveValue('Pay rent');
    expect(description).toHaveValue('Transfer');
    expect(dueDate).toHaveValue('2026-10-01');
  });

  it('offers a cancel button only when onCancel is given', async () => {
    const onCancel = vi.fn();
    const { user } = renderForm({ onCancel });

    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(onCancel).toHaveBeenCalledOnce();
  });
});
