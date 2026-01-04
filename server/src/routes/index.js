import express from 'express';
import authRoutes from './auth.routes.js';
import incomeRoutes from './income.routes.js';
import expenseRoutes from './expense.routes.js';
import loanRoutes from './loan.routes.js';
import exportRouter from './export.js';

const router = express.Router();

/**
 * API Routes Index
 * Centralizes all route mounting
 */
router.use('/auth', authRoutes);
router.use('/incomes', incomeRoutes);
router.use('/expenses', expenseRoutes);
router.use('/loans', loanRoutes);
router.use('/export', exportRouter);

// Health check
router.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

export default router;

