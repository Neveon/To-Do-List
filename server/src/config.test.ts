import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { loadConfig } from './config';

describe('loadConfig', () => {
  it('uses defaults when no variables are set', () => {
    expect(loadConfig({})).toEqual({
      port: 3000,
      dataFile: path.resolve('data/todos.json'),
      clientDistDir: path.resolve(import.meta.dirname, '../../client/dist'),
    });
  });

  it('reads PORT, DATA_FILE and CLIENT_DIST_DIR', () => {
    expect(
      loadConfig({
        PORT: '8080',
        DATA_FILE: '/var/lib/todos/todos.json',
        CLIENT_DIST_DIR: '/srv/todo-client',
      }),
    ).toEqual({
      port: 8080,
      dataFile: '/var/lib/todos/todos.json',
      clientDistDir: '/srv/todo-client',
    });
  });

  it('resolves a relative DATA_FILE against the working directory', () => {
    expect(loadConfig({ DATA_FILE: './store/todos.json' }).dataFile).toBe(
      path.join(process.cwd(), 'store', 'todos.json'),
    );
  });

  it.each(['abc', '', '0', '70000', '3000.5'])('rejects the invalid PORT %j', (port) => {
    expect(() => loadConfig({ PORT: port })).toThrow(/Invalid environment configuration/);
  });
});
