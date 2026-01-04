import express from 'express';
import { verifyToken, requireAdmin } from '../middleware/auth.middleware.js';
import { createTransactionController } from '../controllers/transaction.controller.js';
import { createTransactionService } from '../services/transaction.service.js';
import { expenseRepository } from '../repositories/transaction.repository.js';

const router = express.Router();

// Create service and controller instances
const expenseService = createTransactionService(expenseRepository);
const expenseController = createTransactionController(expenseService);

// Apply token verification to all routes
router.use(verifyToken);

/**
 * Expense Routes
 * GET /api/expenses - Get all expenses (all users)
 * GET /api/expenses/:id - Get expense by ID (all users)
 * POST /api/expenses - Create expense (admin only)
 * POST /api/expenses/bulk - Bulk create expenses (admin only)
 * PUT /api/expenses/:id - Update expense (admin only)
 * DELETE /api/expenses/:id - Delete expense (admin only)
 */
router.get('/', expenseController.getAll);
router.get('/:id', expenseController.getById);
router.post('/', requireAdmin, expenseController.create);
router.post('/bulk', requireAdmin, expenseController.bulkCreate);
router.put('/:id', requireAdmin, expenseController.update);
router.delete('/:id', requireAdmin, expenseController.delete);

export default router;

