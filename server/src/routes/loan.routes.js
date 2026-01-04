import express from 'express';
import { verifyToken, requireAdmin } from '../middleware/auth.middleware.js';
import { createTransactionController } from '../controllers/transaction.controller.js';
import { createTransactionService } from '../services/transaction.service.js';
import { loanRepository } from '../repositories/transaction.repository.js';

const router = express.Router();

// Create service and controller instances
const loanService = createTransactionService(loanRepository);
const loanController = createTransactionController(loanService);

// Apply token verification to all routes
router.use(verifyToken);

/**
 * Loan Routes
 * GET /api/loans - Get all loans (all users)
 * GET /api/loans/:id - Get loan by ID (all users)
 * POST /api/loans - Create loan (admin only)
 * POST /api/loans/bulk - Bulk create loans (admin only)
 * PUT /api/loans/:id - Update loan (admin only)
 * DELETE /api/loans/:id - Delete loan (admin only)
 */
router.get('/', loanController.getAll);
router.get('/:id', loanController.getById);
router.post('/', requireAdmin, loanController.create);
router.post('/bulk', requireAdmin, loanController.bulkCreate);
router.put('/:id', requireAdmin, loanController.update);
router.delete('/:id', requireAdmin, loanController.delete);

export default router;

