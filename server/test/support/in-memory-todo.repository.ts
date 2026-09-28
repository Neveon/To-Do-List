import type { Todo } from '@todo/shared';
import type { TodoRepository } from '../../src/todos/repository/todo.repository';

/**
 * Test-only repository that keeps todos in memory, for fast unit tests without disk I/O.
 * It runs through the same contract suite as the real repository so it cannot drift.
 */
export class InMemoryTodoRepository implements TodoRepository {
  readonly #todos = new Map<string, Todo>();

  findAll(): Promise<Todo[]> {
    return Promise.resolve([...this.#todos.values()].map(copy));
  }

  findById(id: string): Promise<Todo | undefined> {
    const todo = this.#todos.get(id);
    return Promise.resolve(todo && copy(todo));
  }

  create(todo: Todo): Promise<Todo> {
    this.#todos.set(todo.id, copy(todo));
    return Promise.resolve(copy(todo));
  }

  update(todo: Todo): Promise<Todo | undefined> {
    if (!this.#todos.has(todo.id)) {
      return Promise.resolve(undefined);
    }
    this.#todos.set(todo.id, copy(todo));
    return Promise.resolve(copy(todo));
  }

  delete(id: string): Promise<boolean> {
    return Promise.resolve(this.#todos.delete(id));
  }
}

function copy(todo: Todo): Todo {
  return { ...todo };
}
