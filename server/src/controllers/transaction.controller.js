import { asyncHandler } from '../utils/asyncHandler.js';
import { sendSuccess, sendCreated, sendNoContent } from '../utils/responseHelper.js';

/**
 * Transaction Controller Factory
 * Follows Open/Closed Principle - creates controllers for different transaction types
 * Follows Single Responsibility Principle - only handles HTTP request/response
 * @param {TransactionService} service - Transaction service instance
 */
export const createTransactionController = (service) => ({
  /**
   * GET / - Get all transactions
   */
  getAll: asyncHandler(async (req, res) => {
    const data = await service.getAll();
    sendSuccess(res, data);
  }),

  /**
   * GET /:id - Get transaction by ID
   */
  getById: asyncHandler(async (req, res) => {
    const data = await service.getById(req.params.id);
    sendSuccess(res, data);
  }),

  /**
   * POST / - Create new transaction
   */
  create: asyncHandler(async (req, res) => {
    const data = await service.create(req.body);
    sendCreated(res, data);
  }),

  /**
   * POST /bulk - Bulk create transactions
   */
  bulkCreate: asyncHandler(async (req, res) => {
    const { items } = req.body;
    const { results, errors } = await service.bulkCreate(items);
    sendCreated(res, {
      success: true,
      imported: results.length,
      failed: errors.length,
      errors: errors.length > 0 ? errors : undefined
    });
  }),

  /**
   * PUT /:id - Update transaction
   */
  update: asyncHandler(async (req, res) => {
    const data = await service.update(req.params.id, req.body);
    sendSuccess(res, data);
  }),

  /**
   * DELETE /:id - Delete transaction
   */
  delete: asyncHandler(async (req, res) => {
    await service.delete(req.params.id);
    sendNoContent(res);
  })
});

