import { Router } from 'express';
import {
  getComprehensiveAnalytics,
  getFinancialAnalytics,
  getSalesAnalytics,
  getProductAnalytics,
  getInventoryAnalytics,
  getCustomerAnalytics,
} from '../controllers/analytics.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { UserRole } from '@prisma/client';

const router = Router();

// Only ADMIN and MANAGER have access to dedicated business analytics
router.use(authenticate, authorize(UserRole.ADMIN, UserRole.MANAGER));

router.get('/', getComprehensiveAnalytics);
router.get('/financials', getFinancialAnalytics);
router.get('/sales', getSalesAnalytics);
router.get('/products', getProductAnalytics);
router.get('/inventory', getInventoryAnalytics);
router.get('/customers', getCustomerAnalytics);

export default router;
