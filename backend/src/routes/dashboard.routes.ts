import { Router } from 'express';
import { getDashboardStats } from '../controllers/dashboard.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

// Dashboard is accessible to all authenticated staff (ADMIN, MANAGER, CASHIER)
router.use(authenticate);

router.get('/', getDashboardStats);
router.get('/stats', getDashboardStats);

export default router;
