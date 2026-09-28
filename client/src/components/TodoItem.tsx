import { isOverdue, type Todo } from '@todo/shared';

interface TodoItemProps {
  todo: Todo;
  /** Today's date (YYYY-MM-DD), used to flag overdue todos. */
  today: string;
  onToggleCompleted: (todo: Todo) => void;
  /** Disables the checkbox while a change for this todo is being saved. */
  isSaving?: boolean;
}

export function TodoItem({ todo, today, onToggleCompleted, isSaving = false }: TodoItemProps) {
  const overdue = isOverdue(todo, today);

  return (
    <li className={`todo-item${todo.isCompleted ? ' todo-item--completed' : ''}`}>
      <input
        type="checkbox"
        aria-label={`Mark "${todo.title}" as completed`}
        checked={todo.isCompleted}
        disabled={isSaving}
        onChange={() => onToggleCompleted(todo)}
      />
      <span className="todo-item__title">{todo.title}</span>
      {todo.dueDate && (
        <span className="todo-item__due">
          Due <time dateTime={todo.dueDate}>{todo.dueDate}</time>
        </span>
      )}
      {overdue && <span className="badge badge--overdue">Overdue</span>}
    </li>
  );
}
