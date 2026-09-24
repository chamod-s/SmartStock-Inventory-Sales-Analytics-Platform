import { Router } from 'express';
import {
  getPayments,
  getPaymentById,
  getPaymentsBySale,
  recordPayment,
  getPaymentSummary,
} from '../controllers/payment.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { UserRole } from '@prisma/client';

const router = Router();

// Read operations - All authenticated users (Admin, Manager, Cashier)
router.get('/', authenticate, getPayments);
router.get('/summary', authenticate, getPaymentSummary);
router.get('/sale/:saleId', authenticate, getPaymentsBySale);
router.get('/:id', authenticate, getPaymentById);

// Record payment towards a sale - Admin, Manager, and Cashier
router.post(
  '/',
  authenticate,
  authorize(UserRole.ADMIN, UserRole.MANAGER, UserRole.CASHIER),
  recordPayment
);

export default router;
