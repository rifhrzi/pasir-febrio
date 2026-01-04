import { query } from '../config/database.js';

/**
 * User Repository
 * Follows Single Responsibility Principle - only handles user data access
 */
export class UserRepository {
  /**
   * Find a user by username
   * @param {string} username - Username to search
   */
  async findByUsername(username) {
    const { rows } = await query(
      'SELECT * FROM users WHERE username = $1',
      [username]
    );
    return rows[0] || null;
  }

  /**
   * Find a user by ID
   * @param {number} id - User ID
   */
  async findById(id) {
    const { rows } = await query(
      'SELECT id, username, role, created_at FROM users WHERE id = $1',
      [id]
    );
    return rows[0] || null;
  }

  /**
   * Create a new user
   * @param {Object} data - User data with username and password_hash
   */
  async create(data) {
    const { username, password_hash, role = 'admin' } = data;
    const { rows } = await query(
      'INSERT INTO users (username, password_hash, role) VALUES ($1, $2, $3) RETURNING id, username, role, created_at',
      [username, password_hash, role]
    );
    return rows[0];
  }
}

export const userRepository = new UserRepository();

