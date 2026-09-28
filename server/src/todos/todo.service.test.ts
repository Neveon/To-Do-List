import { beforeEach, describe, expect, it } from 'vitest';
import { InMemoryTodoRepository } from '../../test/support/in-memory-todo.repository';
import { makeTodo } from '../../test/support/make-todo';
import { NotFoundError } from '../errors';
import { TodoService } from './todo.service';

const NOW = new Date('2026-09-27T12:00:00.000Z');

describe('TodoService', () => {
  let repository: InMemoryTodoRepository;
  let service: TodoService;

  beforeEach(() => {
    let nextId = 0;
    repository = new InMemoryTodoRepository();
    service = new TodoService({
      repository,
      now: () => NOW,
      generateId: () => `id-${++nextId}`,
    });
  });

  describe('create', () => {
    it('assigns an id and creation time, starts incomplete, and persists the todo', async () => {
      const created = await service.create({
        title: 'Buy milk',
        description: '2 litres',
        dueDate: '2026-10-01',
      });

      expect(created).toEqual({
        id: 'id-1',
        title: 'Buy milk',
        description: '2 litres',
        dueDate: '2026-10-01',
        isCompleted: false,
        createdAt: '2026-09-27T12:00:00.000Z',
      });
      expect(await repository.findById('id-1')).toEqual(created);
    });

    it('gives each todo a unique id', async () => {
      const first = await service.create({ title: 'A', description: null, dueDate: null });
      const second = await service.create({ title: 'B', description: null, dueDate: null });

      expect(first.id).not.toBe(second.id);
    });
  });

  describe('list', () => {
    const allInCreationOrder = { status: 'all', sortBy: 'createdAt', order: 'asc' } as const;

    it('returns all todos', async () => {
      const first = await repository.create(makeTodo());
      const second = await repository.create(makeTodo());

      expect(await service.list(allInCreationOrder)).toEqual([first, second]);
    });

    it('judges overdue todos against the injected clock', async () => {
      const overdue = await repository.create(makeTodo({ dueDate: '2026-09-20' }));
      await repository.create(makeTodo({ dueDate: '2026-10-05' }));

      expect(await service.list({ ...allInCreationOrder, status: 'overdue' })).toEqual([overdue]);
    });

    it('applies the requested sort', async () => {
      const b = await repository.create(makeTodo({ title: 'b' }));
      const a = await repository.create(makeTodo({ title: 'a' }));

      expect(await service.list({ status: 'all', sortBy: 'title', order: 'asc' })).toEqual([a, b]);
    });
  });

  describe('get', () => {
    it('returns the todo with the given id', async () => {
      const todo = await repository.create(makeTodo());

      expect(await service.get(todo.id)).toEqual(todo);
    });

    it('throws NotFoundError for an unknown id', async () => {
      await expect(service.get('missing')).rejects.toThrow(new NotFoundError('Todo', 'missing'));
    });
  });

  describe('update', () => {
    it('changes only the provided fields and persists them', async () => {
      const todo = await repository.create(
        makeTodo({ title: 'Old', description: 'Keep me', dueDate: '2026-10-01' }),
      );

      const updated = await service.update(todo.id, { title: 'New' });

      expect(updated).toEqual({ ...todo, title: 'New' });
      expect(await repository.findById(todo.id)).toEqual(updated);
    });

    it('can change every editable field at once', async () => {
      const todo = await repository.create(makeTodo());

      const updated = await service.update(todo.id, {
        title: 'New',
        description: 'Details',
        dueDate: '2026-12-31',
      });

      expect(updated).toEqual({
        ...todo,
        title: 'New',
        description: 'Details',
        dueDate: '2026-12-31',
      });
    });

    it('clears description and due date when given null', async () => {
      const todo = await repository.create(
        makeTodo({ description: 'Details', dueDate: '2026-10-01' }),
      );

      const updated = await service.update(todo.id, { description: null, dueDate: null });

      expect(updated).toMatchObject({ description: null, dueDate: null });
    });

    it('never changes id, createdAt or completion status', async () => {
      const todo = await repository.create(makeTodo({ isCompleted: true }));

      const updated = await service.update(todo.id, { title: 'New' });

      expect(updated).toMatchObject({
        id: todo.id,
        createdAt: todo.createdAt,
        isCompleted: true,
      });
    });

    it('throws NotFoundError for an unknown id', async () => {
      await expect(service.update('missing', { title: 'New' })).rejects.toBeInstanceOf(
        NotFoundError,
      );
    });
  });

  describe('complete and incomplete', () => {
    it('marks a todo as completed and persists it', async () => {
      const todo = await repository.create(makeTodo());

      const completed = await service.complete(todo.id);

      expect(completed).toEqual({ ...todo, isCompleted: true });
      expect(await repository.findById(todo.id)).toEqual(completed);
    });

    it('marks a todo as not completed and persists it', async () => {
      const todo = await repository.create(makeTodo({ isCompleted: true }));

      const reopened = await service.incomplete(todo.id);

      expect(reopened).toEqual({ ...todo, isCompleted: false });
      expect(await repository.findById(todo.id)).toEqual(reopened);
    });

    it('is idempotent', async () => {
      const todo = await repository.create(makeTodo());

      await service.complete(todo.id);
      expect((await service.complete(todo.id)).isCompleted).toBe(true);

      await service.incomplete(todo.id);
      expect((await service.incomplete(todo.id)).isCompleted).toBe(false);
    });

    it('throws NotFoundError for an unknown id', async () => {
      await expect(service.complete('missing')).rejects.toBeInstanceOf(NotFoundError);
      await expect(service.incomplete('missing')).rejects.toBeInstanceOf(NotFoundError);
    });
  });

  describe('delete', () => {
    it('removes the todo', async () => {
      const doomed = await repository.create(makeTodo());
      const kept = await repository.create(makeTodo());

      await service.delete(doomed.id);

      expect(await repository.findAll()).toEqual([kept]);
    });

    it('throws NotFoundError for an unknown id', async () => {
      await expect(service.delete('missing')).rejects.toBeInstanceOf(NotFoundError);
    });
  });
});
