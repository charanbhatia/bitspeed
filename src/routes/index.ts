import { Router, Request, Response } from 'express';
import contactRoutes from './contact.routes';
import { prisma } from '../config/database';
import { logger } from '../utils/logger';

const router = Router();

router.get('/health', async (_req: Request, res: Response) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.status(200).json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'bitspeed-identity-reconciliation',
      database: 'connected',
    });
  } catch (err) {
    logger.error('Health check DB ping failed', { err });
    res.status(503).json({
      status: 'degraded',
      timestamp: new Date().toISOString(),
      service: 'bitspeed-identity-reconciliation',
      database: 'unreachable',
    });
  }
});

router.use('/', contactRoutes);

export default router;
