import { Router } from 'express';
import {
  getInventory,
  getInventoryHistory,
  adjustInventory,
  getInventorySummary,
  getLowStockAlerts,
} from '../controllers/inventory.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { UserRole } from '@prisma/client';

const router = Router();

// Read operations - All authenticated users (Admin, Manager, Cashier)
router.get('/', authenticate, getInventory);
router.get('/history', authenticate, getInventoryHistory);
router.get('/transactions', authenticate, getInventoryHistory);
router.get('/summary', authenticate, getInventorySummary);
router.get('/low-stock', authenticate, getLowStockAlerts);
router.get('/alerts', authenticate, getLowStockAlerts);

// Inventory adjustments - Authorized users only (Admin & Manager)
router.post('/adjust', authenticate, authorize(UserRole.ADMIN, UserRole.MANAGER), adjustInventory);
router.post('/adjustments', authenticate, authorize(UserRole.ADMIN, UserRole.MANAGER), adjustInventory);

export default router;
