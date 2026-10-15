import { Router } from 'express';
import { getAdminStats, getStaff } from '../controllers/adminController';
import { requireAuth, requireAdmin } from '../middleware/auth';

const router = Router();

router.use(requireAuth);
router.use(requireAdmin);

router.get('/stats', getAdminStats);
router.get('/staff', getStaff);

export default router;
