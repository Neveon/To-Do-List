import express, { type Express } from 'express';
import { createErrorHandler, notFoundHandler, type ErrorLogger } from './http/error-handler';

export interface AppOptions {
  logError?: ErrorLogger;
}

/**
 * Builds the Express application without starting a server, so tests can
 * exercise it in-process and the composition root decides how it is wired.
 */
export function createApp({ logError = console.error }: AppOptions = {}): Express {
  const app = express();
  app.disable('x-powered-by');
  app.use(express.json());

  const api = express.Router();
  api.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
  });
  app.use('/api', api);

  app.use(notFoundHandler);
  app.use(createErrorHandler(logError));
  return app;
}
