import { Router } from 'express';
import { getHealthDiagnostics } from '../controllers/health.controller';

const router = Router();

router.get('/health', getHealthDiagnostics);

export default router;
