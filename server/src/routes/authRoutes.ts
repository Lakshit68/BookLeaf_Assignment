import { Router } from 'express';
import { login, getMe, getDemoUsers } from '../controllers/authController';
import { requireAuth } from '../middleware/auth';
import { validate, loginSchema } from '../middleware/validation';

const router = Router();

router.post('/login', validate(loginSchema), login);
router.get('/me', requireAuth, getMe);
router.get('/demo-users', getDemoUsers);

export default router;
