import { Router } from 'express';
import {
  getPurchases,
  getPurchaseById,
  createPurchase,
  updatePurchase,
} from '../controllers/purchase.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { UserRole } from '@prisma/client';

const router = Router();

// Read operations - All authenticated users (Admin, Manager, Cashier)
router.get('/', authenticate, getPurchases);
router.get('/:id', authenticate, getPurchaseById);

// Write operations - Admin and Manager only (Cashier blocked with 403 Forbidden)
router.post('/', authenticate, authorize(UserRole.ADMIN, UserRole.MANAGER), createPurchase);
router.put('/:id', authenticate, authorize(UserRole.ADMIN, UserRole.MANAGER), updatePurchase);

export default router;
