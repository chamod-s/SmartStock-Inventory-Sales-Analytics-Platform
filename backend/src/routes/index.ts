import { Router } from 'express';
import healthRoutes from './health.routes';
import authRoutes from './auth.routes';
import categoryRoutes from './category.routes';
import productRoutes from './product.routes';
import supplierRoutes from './supplier.routes';
import customerRoutes from './customer.routes';
import purchaseRoutes from './purchase.routes';
import inventoryRoutes from './inventory.routes';
import saleRoutes from './sale.routes';

const router = Router();

router.use('/', healthRoutes);
router.use('/auth', authRoutes);
router.use('/categories', categoryRoutes);
router.use('/products', productRoutes);
router.use('/suppliers', supplierRoutes);
router.use('/customers', customerRoutes);
router.use('/purchases', purchaseRoutes);
router.use('/inventory', inventoryRoutes);
router.use('/sales', saleRoutes);

export default router;

