import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import routes from './routes/index';
import { errorMiddleware, notFoundMiddleware } from './middleware/error.middleware';
import { globalRateLimiter } from './middleware/rate-limit.middleware';

export function createApp(): Application {
  const app = express();

  // Security middleware
  app.use(helmet());
  app.use(cors());
  app.use(globalRateLimiter);

  // Request parsing
  app.use(express.json({ limit: '10kb' }));
  app.use(express.urlencoded({ extended: true, limit: '10kb' }));

  // HTTP request logging
  app.use(morgan(process.env['NODE_ENV'] === 'production' ? 'combined' : 'dev'));

  // API routes
  app.use('/', routes);

  // 404 handler for unmatched routes
  app.use(notFoundMiddleware);

  // Global error handler (must be last)
  app.use(errorMiddleware);

  return app;
}
