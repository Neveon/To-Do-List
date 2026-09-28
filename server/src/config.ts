import path from 'node:path';
import { z } from 'zod';

const environmentSchema = z.object({
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  DATA_FILE: z.string().min(1).default('data/todos.json'),
});

export interface Config {
  port: number;
  /** Absolute path of the JSON file todos are stored in. */
  dataFile: string;
}

/** Reads configuration from environment variables; relative paths resolve against the working directory. */
export function loadConfig(environment: Record<string, string | undefined> = process.env): Config {
  const result = environmentSchema.safeParse(environment);
  if (!result.success) {
    throw new Error(`Invalid environment configuration:\n${z.prettifyError(result.error)}`);
  }
  return { port: result.data.PORT, dataFile: path.resolve(result.data.DATA_FILE) };
}
