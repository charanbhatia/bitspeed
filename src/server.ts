import 'dotenv/config';
import { createApp } from './app';
import { loadEnvironment } from './config/environment';
import DatabaseClient from './config/database';
import { logger } from './utils/logger';

async function bootstrap(): Promise<void> {
  const env = loadEnvironment();
  const app = createApp();

  const server = app.listen(env.PORT, () => {
    logger.info(`Service started`, {
      port: env.PORT,
      environment: env.NODE_ENV,
    });
  });

  async function shutdown(signal: string): Promise<void> {
    logger.info(`Received ${signal}, shutting down gracefully`);
    server.close(async () => {
      await DatabaseClient.disconnect();
      logger.info('Service shut down complete');
      process.exit(0);
    });
  }

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  process.on('unhandledRejection', (reason: unknown) => {
    logger.error('Unhandled promise rejection', { reason });
    process.exit(1);
  });

  process.on('uncaughtException', (err: Error) => {
    logger.error('Uncaught exception', { message: err.message, stack: err.stack });
    process.exit(1);
  });
}

bootstrap().catch((err: unknown) => {
  const message = err instanceof Error ? err.message : String(err);
  process.stderr.write(JSON.stringify({ level: 'error', message: `Bootstrap failed: ${message}` }) + '\n');
  process.exit(1);
});
