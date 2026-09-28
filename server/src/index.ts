import { createApp } from './app';
import { loadConfig } from './config';

const config = loadConfig();
const app = createApp();

const server = app.listen(config.port, (error) => {
  if (error) {
    console.error(`Could not start server on port ${config.port}:`, error);
    process.exit(1);
  }
  console.log(`To-do API listening on http://localhost:${config.port}/api`);
});

function shutDown(signal: NodeJS.Signals): void {
  console.log(`${signal} received, shutting down`);
  server.close(() => process.exit(0));
}

process.once('SIGINT', shutDown);
process.once('SIGTERM', shutDown);
