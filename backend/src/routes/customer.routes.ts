import { Router } from 'express';
import {
  getCustomers,
  getWalkInCustomer,
  getCustomerById,
  createCustomer,
  updateCustomer,
  deleteCustomer,
} from '../controllers/customer.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { UserRole } from '@prisma/client';

const router = Router();

// Read & Walk-in operations - All authenticated roles (Admin, Manager, Cashier)
router.get('/', authenticate, getCustomers);
router.get('/walk-in', authenticate, getWalkInCustomer);
router.get('/:id', authenticate, getCustomerById);

// Create & Update - All authenticated roles (Cashiers register customers at POS checkout)
router.post('/', authenticate, createCustomer);
router.put('/:id', authenticate, updateCustomer);

// Delete - Admin and Manager only (Cashier is blocked with 403 Forbidden)
router.delete('/:id', authenticate, authorize(UserRole.ADMIN, UserRole.MANAGER), deleteCustomer);

export default router;
