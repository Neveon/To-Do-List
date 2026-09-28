import type { Todo } from '@todo/shared';

/**
 * Storage for to-do items. Implementations only persist and retrieve data;
 * business rules (ids, timestamps, validation) belong to the service layer.
 *
 * Implementations must return copies, so callers can never mutate stored state.
 */
export interface TodoRepository {
  /** All todos in insertion order. */
  findAll(): Promise<Todo[]>;

  findById(id: string): Promise<Todo | undefined>;

  create(todo: Todo): Promise<Todo>;

  /** Replaces the stored todo with the same id. Returns `undefined` if it does not exist. */
  update(todo: Todo): Promise<Todo | undefined>;

  /** Returns `false` if no todo with that id exists. */
  delete(id: string): Promise<boolean>;
}
