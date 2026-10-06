import { Router } from 'express';
import {
  getSalesReport,
  getPurchasesReport,
  getInventoryReport,
  getCustomersReport,
  getExpensesReport,
  getProfitReport,
} from '../controllers/report.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { UserRole } from '@prisma/client';

const router = Router();

// Only ADMIN and MANAGER have access to business and financial reports
router.use(authenticate, authorize(UserRole.ADMIN, UserRole.MANAGER));

router.get('/sales', getSalesReport);
router.get('/purchases', getPurchasesReport);
router.get('/inventory', getInventoryReport);
router.get('/customers', getCustomersReport);
router.get('/expenses', getExpensesReport);
router.get('/profit', getProfitReport);

export default router;
