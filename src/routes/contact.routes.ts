import { Router } from 'express';
import { ContactController } from '../controllers/contact.controller';
import { validateIdentifyRequest } from '../middleware/validation.middleware';
import { identifyRateLimiter } from '../middleware/rate-limit.middleware';

const router = Router();
const contactController = new ContactController();

router.post('/identify', identifyRateLimiter, validateIdentifyRequest, contactController.identify);

export default router;
