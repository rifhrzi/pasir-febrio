import { query } from '../config/database.js';

/**
 * Generic Transaction Repository
 * Follows Open/Closed Principle - open for extension via tableName, closed for modification
 * Follows DRY - single implementation for incomes, expenses, loans
 */
export class TransactionRepository {
  constructor(tableName) {
    this.tableName = tableName;
  }

  /**
   * Get all transactions ordered by date descending
   */
  async findAll() {
    const { rows } = await query(
      `SELECT * FROM ${this.tableName} ORDER BY trans_date DESC`
    );
    return rows;
  }

  /**
   * Find a transaction by ID
   * @param {number} id - Transaction ID
   */
  async findById(id) {
    const { rows } = await query(
      `SELECT * FROM ${this.tableName} WHERE id = $1`,
      [id]
    );
    return rows[0] || null;
  }

  /**
   * Create a new transaction
   * @param {Object} data - Transaction data
   */
  async create(data) {
    const { trans_date, category, description, amount, proof_image } = data;
    
    // Handle tables with and without proof_image column
    if (this.tableName === 'expenses' && proof_image !== undefined) {
      const { rows } = await query(
        `INSERT INTO ${this.tableName} (trans_date, category, description, amount, proof_image) 
         VALUES ($1, $2, $3, $4, $5) RETURNING *`,
        [trans_date, category, description, amount, proof_image || null]
      );
      return rows[0];
    }

    const { rows } = await query(
      `INSERT INTO ${this.tableName} (trans_date, category, description, amount) 
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [trans_date, category, description, amount]
    );
    return rows[0];
  }

  /**
   * Update a transaction
   * @param {number} id - Transaction ID
   * @param {Object} data - Updated data
   */
  async update(id, data) {
    const { trans_date, category, description, amount, proof_image } = data;
    
    // Handle tables with and without proof_image column
    if (this.tableName === 'expenses' && proof_image !== undefined) {
      const { rows } = await query(
        `UPDATE ${this.tableName} 
         SET trans_date = $1, category = $2, description = $3, amount = $4, proof_image = $5 
         WHERE id = $6 RETURNING *`,
        [trans_date, category, description, amount, proof_image || null, id]
      );
      return rows[0] || null;
    }

    const { rows } = await query(
      `UPDATE ${this.tableName} 
       SET trans_date = $1, category = $2, description = $3, amount = $4 
       WHERE id = $5 RETURNING *`,
      [trans_date, category, description, amount, id]
    );
    return rows[0] || null;
  }

  /**
   * Delete a transaction
   * @param {number} id - Transaction ID
   */
  async delete(id) {
    const { rowCount } = await query(
      `DELETE FROM ${this.tableName} WHERE id = $1`,
      [id]
    );
    return rowCount > 0;
  }

  /**
   * Bulk create transactions
   * @param {Array} items - Array of transaction objects
   */
  async bulkCreate(items) {
    const results = [];
    const errors = [];

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      try {
        const created = await this.create({
          trans_date: item.trans_date,
          category: item.category || 'Lainnya',
          description: item.description || '',
          amount: Number(item.amount) || 0,
          proof_image: item.proof_image
        });
        results.push(created);
      } catch (err) {
        errors.push({ index: i, error: err.message });
      }
    }

    return { results, errors };
  }
}

// Create singleton instances for each transaction type
export const incomeRepository = new TransactionRepository('incomes');
export const expenseRepository = new TransactionRepository('expenses');
export const loanRepository = new TransactionRepository('loans');

