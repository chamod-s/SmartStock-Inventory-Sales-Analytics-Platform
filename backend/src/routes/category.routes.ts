import { Router } from 'express';
import {
  getCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory,
} from '../controllers/category.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { UserRole } from '@prisma/client';

const router = Router();

// Read operations - All authenticated users (Admin, Manager, Cashier)
router.get('/', authenticate, getCategories);
router.get('/:id', authenticate, getCategoryById);

// Write operations - Admin and Manager only
router.post('/', authenticate, authorize(UserRole.ADMIN, UserRole.MANAGER), createCategory);
router.put('/:id', authenticate, authorize(UserRole.ADMIN, UserRole.MANAGER), updateCategory);
router.delete('/:id', authenticate, authorize(UserRole.ADMIN, UserRole.MANAGER), deleteCategory);

export default router;
