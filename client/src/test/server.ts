import { setupServer } from 'msw/node';

/**
 * Mock API for component tests. It starts with no handlers: each test declares the
 * responses it needs with `server.use(...)`, so every request a test makes is explicit.
 */
export const server = setupServer();
