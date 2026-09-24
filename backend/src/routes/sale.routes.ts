import { Router } from 'express';
import {
  getSales,
  getSaleById,
  getSaleByInvoice,
  createSale,
  getSaleSummary,
} from '../controllers/sale.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { UserRole } from '@prisma/client';

const router = Router();

// Read operations - All authenticated users (Admin, Manager, Cashier)
router.get('/', authenticate, getSales);
router.get('/summary', authenticate, getSaleSummary);
router.get('/invoice/:invoiceNumber', authenticate, getSaleByInvoice);
router.get('/:id', authenticate, getSaleById);

// Create checkout sale - Admin, Manager, and Cashier
router.post(
  '/',
  authenticate,
  authorize(UserRole.ADMIN, UserRole.MANAGER, UserRole.CASHIER),
  createSale
);

export default router;
