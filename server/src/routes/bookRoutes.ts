import { Router } from 'express';
import { getMyBooks, getBookById, getAllBooks } from '../controllers/bookController';
import { requireAuth, requireAdmin } from '../middleware/auth';

const router = Router();

router.use(requireAuth);

router.get('/my-books', getMyBooks);
router.get('/all', requireAdmin, getAllBooks);
router.get('/:id', getBookById);

export default router;
