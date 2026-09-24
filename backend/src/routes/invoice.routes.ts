import { Router } from 'express';
import {
  getInvoices,
  getInvoiceById,
  getInvoiceByNumber,
  downloadInvoiceHtml,
} from '../controllers/invoice.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

// Read operations - All authenticated users (Admin, Manager, Cashier)
router.get('/', authenticate, getInvoices);
router.get('/number/:invoiceNumber', authenticate, getInvoiceByNumber);
router.get('/:id', authenticate, getInvoiceById);
router.get('/:id/download', authenticate, downloadInvoiceHtml);

export default router;
