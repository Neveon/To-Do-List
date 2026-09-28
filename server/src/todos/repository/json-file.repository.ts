import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { todoSchema, type Todo } from '@todo/shared';
import { z } from 'zod';
import type { TodoRepository } from './todo.repository';

const dataFileSchema = z.object({ todos: z.array(todoSchema) });

/** The data file exists but cannot be used. Raised instead of overwriting the user's data. */
export class DataFileError extends Error {
  override name = 'DataFileError';
}

/**
 * Stores all todos in a single JSON file: `{ "todos": [...] }`.
 *
 * - The file is read once and cached; this process is assumed to be its only writer.
 * - Operations are queued and run one at a time, so concurrent requests cannot
 *   overwrite each other's changes.
 * - Writes go to a temporary file that is then renamed over the original, so a crash
 *   mid-write never leaves a truncated file behind.
 * - The cache is only updated after a successful write, so it never diverges from disk.
 */
export class JsonFileTodoRepository implements TodoRepository {
  readonly #filePath: string;
  #todos: Todo[] | undefined;
  #queue: Promise<unknown> = Promise.resolve();

  constructor(filePath: string) {
    this.#filePath = filePath;
  }

  findAll(): Promise<Todo[]> {
    return this.#enqueue(async () => (await this.#load()).map(copy));
  }

  findById(id: string): Promise<Todo | undefined> {
    return this.#enqueue(async () => {
      const todo = (await this.#load()).find((candidate) => candidate.id === id);
      return todo && copy(todo);
    });
  }

  create(todo: Todo): Promise<Todo> {
    return this.#enqueue(async () => {
      const todos = await this.#load();
      await this.#save([...todos, copy(todo)]);
      return copy(todo);
    });
  }

  update(todo: Todo): Promise<Todo | undefined> {
    return this.#enqueue(async () => {
      const todos = await this.#load();
      if (!todos.some((candidate) => candidate.id === todo.id)) {
        return undefined;
      }
      await this.#save(
        todos.map((candidate) => (candidate.id === todo.id ? copy(todo) : candidate)),
      );
      return copy(todo);
    });
  }

  delete(id: string): Promise<boolean> {
    return this.#enqueue(async () => {
      const todos = await this.#load();
      const remaining = todos.filter((candidate) => candidate.id !== id);
      if (remaining.length === todos.length) {
        return false;
      }
      await this.#save(remaining);
      return true;
    });
  }

  /** Runs operations strictly one after another; a failed operation does not block later ones. */
  #enqueue<T>(operation: () => Promise<T>): Promise<T> {
    const result = this.#queue.then(operation);
    this.#queue = result.catch(() => undefined);
    return result;
  }

  async #load(): Promise<Todo[]> {
    if (this.#todos) {
      return this.#todos;
    }

    let contents: string;
    try {
      contents = await readFile(this.#filePath, 'utf8');
    } catch (error) {
      if (isFileNotFound(error)) {
        this.#todos = [];
        return this.#todos;
      }
      throw error;
    }

    let json: unknown;
    try {
      json = JSON.parse(contents);
    } catch (cause) {
      throw new DataFileError(`Data file ${this.#filePath} is not valid JSON`, { cause });
    }

    const parsed = dataFileSchema.safeParse(json);
    if (!parsed.success) {
      throw new DataFileError(
        `Data file ${this.#filePath} does not contain valid todo data:\n${z.prettifyError(parsed.error)}`,
      );
    }

    this.#todos = parsed.data.todos;
    return this.#todos;
  }

  async #save(todos: Todo[]): Promise<void> {
    const tempPath = `${this.#filePath}.tmp`;
    await mkdir(path.dirname(this.#filePath), { recursive: true });
    await writeFile(tempPath, `${JSON.stringify({ todos }, null, 2)}\n`, 'utf8');
    await rename(tempPath, this.#filePath);
    this.#todos = todos;
  }
}

function copy(todo: Todo): Todo {
  return { ...todo };
}

function isFileNotFound(error: unknown): boolean {
  return error instanceof Error && 'code' in error && error.code === 'ENOENT';
}
