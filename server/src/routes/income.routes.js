import express from 'express';
import { verifyToken, requireAdmin } from '../middleware/auth.middleware.js';
import { createTransactionController } from '../controllers/transaction.controller.js';
import { createTransactionService } from '../services/transaction.service.js';
import { incomeRepository } from '../repositories/transaction.repository.js';

const router = express.Router();

// Create service and controller instances
const incomeService = createTransactionService(incomeRepository);
const incomeController = createTransactionController(incomeService);

// Apply token verification to all routes
router.use(verifyToken);

/**
 * Income Routes
 * GET /api/incomes - Get all incomes (all users)
 * GET /api/incomes/:id - Get income by ID (all users)
 * POST /api/incomes - Create income (admin only)
 * POST /api/incomes/bulk - Bulk create incomes (admin only)
 * PUT /api/incomes/:id - Update income (admin only)
 * DELETE /api/incomes/:id - Delete income (admin only)
 */
router.get('/', incomeController.getAll);
router.get('/:id', incomeController.getById);
router.post('/', requireAdmin, incomeController.create);
router.post('/bulk', requireAdmin, incomeController.bulkCreate);
router.put('/:id', requireAdmin, incomeController.update);
router.delete('/:id', requireAdmin, incomeController.delete);

export default router;

