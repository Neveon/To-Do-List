import { randomUUID } from 'node:crypto';
import type { CreateTodoInput, Todo, UpdateTodoInput } from '@todo/shared';
import { NotFoundError } from '../errors';
import type { TodoRepository } from './repository/todo.repository';

export interface TodoServiceDependencies {
  repository: TodoRepository;
  /** Injectable clock so tests can control timestamps. */
  now?: () => Date;
  /** Injectable id generator so tests can predict ids. */
  generateId?: () => string;
}

/**
 * Business rules for to-do items. Inputs are expected to be validated already
 * (see the shared Zod schemas); this layer owns ids, timestamps and existence checks.
 */
export class TodoService {
  readonly #repository: TodoRepository;
  readonly #now: () => Date;
  readonly #generateId: () => string;

  constructor({
    repository,
    now = () => new Date(),
    generateId = randomUUID,
  }: TodoServiceDependencies) {
    this.#repository = repository;
    this.#now = now;
    this.#generateId = generateId;
  }

  list(): Promise<Todo[]> {
    return this.#repository.findAll();
  }

  async get(id: string): Promise<Todo> {
    const todo = await this.#repository.findById(id);
    if (!todo) {
      throw new NotFoundError('Todo', id);
    }
    return todo;
  }

  create(input: CreateTodoInput): Promise<Todo> {
    return this.#repository.create({
      id: this.#generateId(),
      title: input.title,
      description: input.description,
      dueDate: input.dueDate,
      isCompleted: false,
      createdAt: this.#now().toISOString(),
    });
  }

  /** Applies only the provided fields; `null` clears description or dueDate. */
  async update(id: string, changes: UpdateTodoInput): Promise<Todo> {
    const existing = await this.get(id);
    return this.#save({
      ...existing,
      title: changes.title ?? existing.title,
      description: changes.description === undefined ? existing.description : changes.description,
      dueDate: changes.dueDate === undefined ? existing.dueDate : changes.dueDate,
    });
  }

  complete(id: string): Promise<Todo> {
    return this.#setCompleted(id, true);
  }

  incomplete(id: string): Promise<Todo> {
    return this.#setCompleted(id, false);
  }

  async delete(id: string): Promise<void> {
    const deleted = await this.#repository.delete(id);
    if (!deleted) {
      throw new NotFoundError('Todo', id);
    }
  }

  async #setCompleted(id: string, isCompleted: boolean): Promise<Todo> {
    const existing = await this.get(id);
    return this.#save({ ...existing, isCompleted });
  }

  /** Persists a changed todo; it may have been deleted concurrently since it was read. */
  async #save(todo: Todo): Promise<Todo> {
    const saved = await this.#repository.update(todo);
    if (!saved) {
      throw new NotFoundError('Todo', todo.id);
    }
    return saved;
  }
}
