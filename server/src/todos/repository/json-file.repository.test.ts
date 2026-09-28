import { mkdir, mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { makeTodo } from '../../../test/support/make-todo';
import { describeTodoRepositoryContract } from '../../../test/support/todo-repository.contract';
import { DataFileError, JsonFileTodoRepository } from './json-file.repository';

let dataDir: string;
let dataFile: string;

beforeEach(async () => {
  dataDir = await mkdtemp(path.join(tmpdir(), 'todo-repository-'));
  dataFile = path.join(dataDir, 'nested', 'todos.json');
});

afterEach(async () => {
  await rm(dataDir, { recursive: true, force: true });
});

describeTodoRepositoryContract(
  'JsonFileTodoRepository',
  () => new JsonFileTodoRepository(dataFile),
);

describe('JsonFileTodoRepository file handling', () => {
  async function readDataFile(): Promise<unknown> {
    return JSON.parse(await readFile(dataFile, 'utf8'));
  }

  async function writeDataFile(contents: string): Promise<void> {
    await mkdir(path.dirname(dataFile), { recursive: true });
    await writeFile(dataFile, contents, 'utf8');
  }

  it('treats a missing file as empty and does not create it on read', async () => {
    const repository = new JsonFileTodoRepository(dataFile);

    expect(await repository.findAll()).toEqual([]);
    await expect(readFile(dataFile)).rejects.toMatchObject({ code: 'ENOENT' });
  });

  it('creates missing directories and writes todos as { todos: [...] }', async () => {
    const todo = makeTodo();

    await new JsonFileTodoRepository(dataFile).create(todo);

    expect(await readDataFile()).toEqual({ todos: [todo] });
  });

  it('keeps data across instances, as after a server restart', async () => {
    const first = new JsonFileTodoRepository(dataFile);
    const kept = await first.create(makeTodo());
    const changed = await first.create(makeTodo({ title: 'Before' }));
    const deleted = await first.create(makeTodo());
    await first.update({ ...changed, title: 'After' });
    await first.delete(deleted.id);

    const restarted = new JsonFileTodoRepository(dataFile);

    expect(await restarted.findAll()).toEqual([kept, { ...changed, title: 'After' }]);
  });

  it('loads todos from an existing file', async () => {
    const todo = makeTodo();
    await writeDataFile(JSON.stringify({ todos: [todo] }));

    expect(await new JsonFileTodoRepository(dataFile).findAll()).toEqual([todo]);
  });

  it('keeps every todo when many are created concurrently', async () => {
    const repository = new JsonFileTodoRepository(dataFile);
    const todos = Array.from({ length: 25 }, () => makeTodo());

    await Promise.all(todos.map((todo) => repository.create(todo)));

    expect(await readDataFile()).toEqual({ todos });
  });

  it('leaves no temporary file behind after writing', async () => {
    await new JsonFileTodoRepository(dataFile).create(makeTodo());

    expect(await readdir(path.dirname(dataFile))).toEqual(['todos.json']);
  });

  it('rejects a file that is not valid JSON', async () => {
    await writeDataFile('{ not json');

    const result = new JsonFileTodoRepository(dataFile).findAll();

    await expect(result).rejects.toBeInstanceOf(DataFileError);
    await expect(result).rejects.toThrow(`Data file ${dataFile} is not valid JSON`);
  });

  it('rejects JSON that does not contain valid todos', async () => {
    await writeDataFile(JSON.stringify({ todos: [{ ...makeTodo(), title: 42 }] }));

    await expect(new JsonFileTodoRepository(dataFile).findAll()).rejects.toThrow(
      /does not contain valid todo data/,
    );
  });

  it('never overwrites a corrupt file', async () => {
    await writeDataFile('{ not json');
    const repository = new JsonFileTodoRepository(dataFile);

    await expect(repository.create(makeTodo())).rejects.toBeInstanceOf(DataFileError);

    expect(await readFile(dataFile, 'utf8')).toBe('{ not json');
  });

  it('keeps serving later requests after an operation fails', async () => {
    await writeDataFile('{ not json');
    const repository = new JsonFileTodoRepository(dataFile);
    await expect(repository.findAll()).rejects.toBeInstanceOf(DataFileError);

    await writeDataFile(JSON.stringify({ todos: [] }));

    expect(await repository.findAll()).toEqual([]);
  });
});
