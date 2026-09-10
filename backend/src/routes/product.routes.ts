import { Router } from 'express';
import {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
} from '../controllers/product.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { UserRole } from '@prisma/client';

const router = Router();

// Read operations - All authenticated users (Admin, Manager, Cashier)
router.get('/', authenticate, getProducts);
router.get('/:id', authenticate, getProductById);

// Write operations - Admin and Manager only
router.post('/', authenticate, authorize(UserRole.ADMIN, UserRole.MANAGER), createProduct);
router.put('/:id', authenticate, authorize(UserRole.ADMIN, UserRole.MANAGER), updateProduct);
router.delete('/:id', authenticate, authorize(UserRole.ADMIN, UserRole.MANAGER), deleteProduct);

export default router;
