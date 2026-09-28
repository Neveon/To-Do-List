import { createApp } from './app';
import { loadConfig } from './config';
import { JsonFileTodoRepository } from './todos/repository/json-file.repository';
import { TodoService } from './todos/todo.service';

// Composition root: the only place that chooses concrete implementations.
const config = loadConfig();
const repository = new JsonFileTodoRepository(config.dataFile);
const todoService = new TodoService({ repository });

// Read the data file up front so a corrupt file stops startup instead of failing requests later.
await repository.findAll();

const app = createApp({ todoService });

const server = app.listen(config.port, (error) => {
  if (error) {
    console.error(`Could not start server on port ${config.port}:`, error);
    process.exit(1);
  }
  console.log(`To-do API listening on http://localhost:${config.port}/api`);
  console.log(`Storing todos in ${config.dataFile}`);
});

function shutDown(signal: NodeJS.Signals): void {
  console.log(`${signal} received, shutting down`);
  server.close(() => process.exit(0));
}

process.once('SIGINT', shutDown);
process.once('SIGTERM', shutDown);
