import { notFound } from '../utils/AppError.js';

/**
 * Transaction Service
 * Follows Single Responsibility Principle - handles business logic for transactions
 * Follows Dependency Inversion Principle - depends on repository abstraction
 */
export class TransactionService {
  constructor(repository) {
    this.repository = repository;
  }

  /**
   * Get all transactions
   */
  async getAll() {
    return this.repository.findAll();
  }

  /**
   * Get a transaction by ID
   * @param {number} id - Transaction ID
   * @throws {AppError} If transaction not found
   */
  async getById(id) {
    const transaction = await this.repository.findById(id);
    if (!transaction) {
      throw notFound('Transaction');
    }
    return transaction;
  }

  /**
   * Create a new transaction
   * @param {Object} data - Transaction data
   */
  async create(data) {
    return this.repository.create(data);
  }

  /**
   * Update a transaction
   * @param {number} id - Transaction ID
   * @param {Object} data - Updated data
   * @throws {AppError} If transaction not found
   */
  async update(id, data) {
    const updated = await this.repository.update(id, data);
    if (!updated) {
      throw notFound('Transaction');
    }
    return updated;
  }

  /**
   * Delete a transaction
   * @param {number} id - Transaction ID
   * @throws {AppError} If transaction not found
   */
  async delete(id) {
    const deleted = await this.repository.delete(id);
    if (!deleted) {
      throw notFound('Transaction');
    }
    return true;
  }

  /**
   * Bulk create transactions
   * @param {Array} items - Array of transaction objects
   */
  async bulkCreate(items) {
    if (!Array.isArray(items) || items.length === 0) {
      throw new Error('Items array is required');
    }
    return this.repository.bulkCreate(items);
  }
}

// Factory function to create service instances
export const createTransactionService = (repository) => new TransactionService(repository);

