import { beforeEach, describe, expect, it } from 'vitest';
import type { TodoRepository } from '../../src/todos/repository/todo.repository';
import { makeTodo } from './make-todo';

/**
 * Behaviour every TodoRepository implementation must satisfy. Running the same suite
 * against each implementation proves they are interchangeable.
 */
export function describeTodoRepositoryContract(
  name: string,
  createRepository: () => TodoRepository | Promise<TodoRepository>,
): void {
  describe(`${name} (TodoRepository contract)`, () => {
    let repository: TodoRepository;

    beforeEach(async () => {
      repository = await createRepository();
    });

    it('starts empty', async () => {
      expect(await repository.findAll()).toEqual([]);
    });

    it('creates a todo and returns it', async () => {
      const todo = makeTodo({ title: 'Buy milk', dueDate: '2026-10-01' });

      expect(await repository.create(todo)).toEqual(todo);
      expect(await repository.findById(todo.id)).toEqual(todo);
    });

    it('lists todos in insertion order', async () => {
      const first = await repository.create(makeTodo());
      const second = await repository.create(makeTodo());
      const third = await repository.create(makeTodo());

      expect(await repository.findAll()).toEqual([first, second, third]);
    });

    it('returns undefined when finding an unknown id', async () => {
      await repository.create(makeTodo());

      expect(await repository.findById('unknown')).toBeUndefined();
    });

    it('replaces a todo on update and returns it', async () => {
      const original = await repository.create(makeTodo({ title: 'Old' }));
      const other = await repository.create(makeTodo());
      const changed = { ...original, title: 'New', isCompleted: true };

      expect(await repository.update(changed)).toEqual(changed);
      expect(await repository.findAll()).toEqual([changed, other]);
    });

    it('returns undefined when updating an unknown id and stores nothing', async () => {
      expect(await repository.update(makeTodo())).toBeUndefined();
      expect(await repository.findAll()).toEqual([]);
    });

    it('deletes a todo and reports success', async () => {
      const doomed = await repository.create(makeTodo());
      const kept = await repository.create(makeTodo());

      expect(await repository.delete(doomed.id)).toBe(true);
      expect(await repository.findAll()).toEqual([kept]);
      expect(await repository.findById(doomed.id)).toBeUndefined();
    });

    it('returns false when deleting an unknown id', async () => {
      const kept = await repository.create(makeTodo());

      expect(await repository.delete('unknown')).toBe(false);
      expect(await repository.findAll()).toEqual([kept]);
    });

    it('does not let callers mutate stored todos through returned or passed objects', async () => {
      const input = makeTodo({ title: 'Original' });
      const created = await repository.create(input);

      input.title = 'Mutated input';
      created.title = 'Mutated result';
      (await repository.findAll())[0]!.title = 'Mutated list item';
      (await repository.findById(input.id))!.title = 'Mutated found item';

      expect((await repository.findById(input.id))?.title).toBe('Original');
    });
  });
}
