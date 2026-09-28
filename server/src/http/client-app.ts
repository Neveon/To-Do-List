import path from 'node:path';
import express, { Router } from 'express';

/**
 * Serves the built single-page app from `clientDir`:
 * - fingerprinted files under /assets are cached for a year;
 * - every other GET outside /api returns index.html (never cached), so client-side
 *   routes such as /todos/:id work when opened directly or refreshed.
 */
export function createClientAppRouter(clientDir: string): Router {
  const router = Router();
  const indexFile = path.join(clientDir, 'index.html');

  router.use(
    express.static(clientDir, {
      index: false,
      setHeaders: (res, filePath) => {
        if (filePath.startsWith(path.join(clientDir, 'assets') + path.sep)) {
          res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        }
      },
    }),
  );

  router.get(/^\/(?!api(?:\/|$)).*/, (_req, res) => {
    res.setHeader('Cache-Control', 'no-cache');
    res.sendFile(indexFile);
  });

  return router;
}
