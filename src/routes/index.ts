import { Router, Request, Response } from 'express';
import contactRoutes from './contact.routes';

const router = Router();

router.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'bitspeed-identity-reconciliation',
  });
});

router.use('/', contactRoutes);

export default router;
