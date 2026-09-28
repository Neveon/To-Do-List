import express, { type Express } from 'express';
import { createClientAppRouter } from './http/client-app';
import { createErrorHandler, notFoundHandler, type ErrorLogger } from './http/error-handler';
import { createTodoRouter } from './todos/todo.routes';
import type { TodoService } from './todos/todo.service';

export interface AppDependencies {
  todoService: TodoService;
  logError?: ErrorLogger;
  /** Directory of the built client app to serve alongside the API; omit to serve the API only. */
  clientDir?: string;
}

/**
 * Builds the Express application without starting a server, so tests can
 * exercise it in-process and the composition root decides how it is wired.
 */
export function createApp({
  todoService,
  logError = console.error,
  clientDir,
}: AppDependencies): Express {
  const app = express();
  app.disable('x-powered-by');
  app.use(express.json());

  const api = express.Router();
  api.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
  });
  api.use('/todos', createTodoRouter(todoService));
  app.use('/api', api);

  if (clientDir) {
    app.use(createClientAppRouter(clientDir));
  }

  app.use(notFoundHandler);
  app.use(createErrorHandler(logError));
  return app;
}
