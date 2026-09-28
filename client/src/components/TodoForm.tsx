import { createTodoSchema, type CreateTodoInput } from '@todo/shared';
import { useId, useState, type FormEvent } from 'react';
import { ApiError } from '../api/http';

export interface TodoFormValues {
  title: string;
  description: string;
  /** YYYY-MM-DD, or empty for no due date. */
  dueDate: string;
}

type Field = keyof TodoFormValues;
type FieldErrors = Partial<Record<Field, string>>;

const EMPTY_VALUES: TodoFormValues = { title: '', description: '', dueDate: '' };
const FIELDS: readonly Field[] = ['title', 'description', 'dueDate'];

interface TodoFormProps {
  initialValues?: TodoFormValues;
  submitLabel: string;
  /** Receives validated, normalized input. Throw (e.g. an ApiError) to show an error. */
  onSubmit: (input: CreateTodoInput) => Promise<void>;
  /** Clears the fields after a successful submit, for "add another" forms. */
  resetOnSuccess?: boolean;
  onCancel?: () => void;
}

/**
 * Title / description / due date form used for both creating and editing todos.
 * It validates with the same schema as the server, and maps any server-side
 * field errors back onto the matching inputs.
 */
export function TodoForm({
  initialValues = EMPTY_VALUES,
  submitLabel,
  onSubmit,
  resetOnSuccess = false,
  onCancel,
}: TodoFormProps) {
  const id = useId();
  const [values, setValues] = useState(initialValues);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string>();
  const [isSubmitting, setIsSubmitting] = useState(false);

  function setValue(field: Field, value: string) {
    setValues((current) => ({ ...current, [field]: value }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(undefined);

    const parsed = createTodoSchema.safeParse({
      title: values.title,
      description: values.description || null,
      dueDate: values.dueDate || null,
    });
    if (!parsed.success) {
      setFieldErrors(toFieldErrors(parsed.error.issues.map(toDetail)));
      return;
    }

    setFieldErrors({});
    setIsSubmitting(true);
    try {
      await onSubmit(parsed.data);
      if (resetOnSuccess) {
        setValues(EMPTY_VALUES);
      }
    } catch (caught) {
      const serverFieldErrors = caught instanceof ApiError ? toFieldErrors(caught.details) : {};
      setFieldErrors(serverFieldErrors);
      if (Object.keys(serverFieldErrors).length === 0) {
        setFormError((caught as Error).message);
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  function fieldProps(field: Field) {
    const error = fieldErrors[field];
    return {
      id: `${id}-${field}`,
      name: field,
      value: values[field],
      'aria-invalid': error ? true : undefined,
      'aria-describedby': error ? `${id}-${field}-error` : undefined,
    };
  }

  function errorFor(field: Field) {
    const error = fieldErrors[field];
    return error ? (
      <p id={`${id}-${field}-error`} className="field-error">
        {error}
      </p>
    ) : null;
  }

  return (
    <form className="todo-form" noValidate onSubmit={(event) => void handleSubmit(event)}>
      {formError && <p role="alert">{formError}</p>}

      <div className="field">
        <label htmlFor={`${id}-title`}>Title</label>
        <input
          type="text"
          {...fieldProps('title')}
          onChange={(event) => setValue('title', event.target.value)}
        />
        {errorFor('title')}
      </div>

      <div className="field">
        <label htmlFor={`${id}-description`}>Description (optional)</label>
        <textarea
          rows={3}
          {...fieldProps('description')}
          onChange={(event) => setValue('description', event.target.value)}
        />
        {errorFor('description')}
      </div>

      <div className="field">
        <label htmlFor={`${id}-dueDate`}>Due date (optional)</label>
        <input
          type="date"
          {...fieldProps('dueDate')}
          onChange={(event) => setValue('dueDate', event.target.value)}
        />
        {errorFor('dueDate')}
      </div>

      <div className="form-actions">
        <button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Saving…' : submitLabel}
        </button>
        {onCancel && (
          <button type="button" onClick={onCancel} disabled={isSubmitting}>
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}

function toDetail(issue: { path: PropertyKey[]; message: string }) {
  return { path: issue.path.map(String).join('.'), message: issue.message };
}

/** Keeps the first message per known field; errors for other paths are ignored here. */
function toFieldErrors(details: { path: string; message: string }[]): FieldErrors {
  const errors: FieldErrors = {};
  for (const { path, message } of details) {
    const field = FIELDS.find((candidate) => candidate === path);
    if (field && !errors[field]) {
      errors[field] = message;
    }
  }
  return errors;
}
