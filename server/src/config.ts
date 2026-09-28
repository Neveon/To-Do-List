import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';

/**
 * The client build ships with the server code, so by default it is located relative to this
 * module; that is two levels below the repository root both in src/ and in the dist/ bundle.
 */
const DEFAULT_CLIENT_DIST_DIR = fileURLToPath(new URL('../../client/dist', import.meta.url));

const environmentSchema = z.object({
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  DATA_FILE: z.string().min(1).default('data/todos.json'),
  CLIENT_DIST_DIR: z.string().min(1).default(DEFAULT_CLIENT_DIST_DIR),
});

export interface Config {
  port: number;
  /** Absolute path of the JSON file todos are stored in. */
  dataFile: string;
  /** Absolute path of the built client app, served when it exists. */
  clientDistDir: string;
}

/** Reads configuration from environment variables; relative paths resolve against the working directory. */
export function loadConfig(environment: Record<string, string | undefined> = process.env): Config {
  const result = environmentSchema.safeParse(environment);
  if (!result.success) {
    throw new Error(`Invalid environment configuration:\n${z.prettifyError(result.error)}`);
  }
  return {
    port: result.data.PORT,
    dataFile: path.resolve(result.data.DATA_FILE),
    clientDistDir: path.resolve(result.data.CLIENT_DIST_DIR),
  };
}
