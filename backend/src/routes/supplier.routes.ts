import { Router } from 'express';
import {
  getSuppliers,
  getSupplierById,
  createSupplier,
  updateSupplier,
  deleteSupplier,
} from '../controllers/supplier.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { UserRole } from '@prisma/client';

const router = Router();

// Read operations - All authenticated users (Admin, Manager, Cashier)
router.get('/', authenticate, getSuppliers);
router.get('/:id', authenticate, getSupplierById);

// Write operations - Admin and Manager only (Cashier blocked with 403 Forbidden)
router.post('/', authenticate, authorize(UserRole.ADMIN, UserRole.MANAGER), createSupplier);
router.put('/:id', authenticate, authorize(UserRole.ADMIN, UserRole.MANAGER), updateSupplier);
router.delete('/:id', authenticate, authorize(UserRole.ADMIN, UserRole.MANAGER), deleteSupplier);

export default router;
