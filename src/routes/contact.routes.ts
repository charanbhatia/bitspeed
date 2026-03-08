import { Router } from 'express';
import { ContactController } from '../controllers/contact.controller';
import { validateIdentifyRequest } from '../middleware/validation.middleware';
import { identifyRateLimiter } from '../middleware/rate-limit.middleware';

const router = Router();
const contactController = new ContactController();

router.post('/identify', identifyRateLimiter, validateIdentifyRequest, contactController.identify);
router.get('/contacts/:id', contactController.getById);

export default router;
