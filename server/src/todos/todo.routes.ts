import { createTodoSchema, updateTodoSchema } from '@todo/shared';
import { Router } from 'express';
import type { TodoService } from './todo.service';

/**
 * Maps HTTP requests to TodoService calls. Bodies are validated with the shared schemas;
 * validation and not-found errors propagate to the error handler, which sets the status.
 */
export function createTodoRouter(todoService: TodoService): Router {
  const router = Router();

  router.get('/', async (_req, res) => {
    res.json(await todoService.list());
  });

  router.post('/', async (req, res) => {
    const todo = await todoService.create(createTodoSchema.parse(req.body));
    res.status(201).location(`${req.baseUrl}/${todo.id}`).json(todo);
  });

  router.get('/:id', async (req, res) => {
    res.json(await todoService.get(req.params.id));
  });

  router.patch('/:id', async (req, res) => {
    res.json(await todoService.update(req.params.id, updateTodoSchema.parse(req.body)));
  });

  router.post('/:id/complete', async (req, res) => {
    res.json(await todoService.complete(req.params.id));
  });

  router.post('/:id/incomplete', async (req, res) => {
    res.json(await todoService.incomplete(req.params.id));
  });

  router.delete('/:id', async (req, res) => {
    await todoService.delete(req.params.id);
    res.status(204).end();
  });

  return router;
}
