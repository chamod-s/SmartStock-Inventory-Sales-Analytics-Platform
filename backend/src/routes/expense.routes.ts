import { Router } from 'express';
import {
  getExpenses,
  getExpenseById,
  createExpense,
  updateExpense,
  deactivateExpense,
  activateExpense,
  deleteExpense,
  getExpenseSummary,
} from '../controllers/expense.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { UserRole } from '@prisma/client';

const router = Router();

// Only ADMIN and MANAGER should manage expenses
router.use(authenticate, authorize(UserRole.ADMIN, UserRole.MANAGER));

router.get('/', getExpenses);
router.get('/summary', getExpenseSummary);
router.get('/:id', getExpenseById);
router.post('/', createExpense);
router.put('/:id', updateExpense);
router.patch('/:id/deactivate', deactivateExpense);
router.patch('/:id/activate', activateExpense);
router.delete('/:id', deleteExpense);

export default router;
