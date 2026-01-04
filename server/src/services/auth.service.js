import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import { unauthorized } from '../utils/AppError.js';
import { userRepository } from '../repositories/user.repository.js';

dotenv.config();

/**
 * Auth Service
 * Follows Single Responsibility Principle - handles authentication logic
 */
class AuthService {
  constructor(repository) {
    this.repository = repository;
    this.jwtSecret = process.env.JWT_SECRET;
    this.jwtExpiresIn = '8h';
  }

  /**
   * Login user and return JWT token
   * @param {string} username - Username
   * @param {string} password - Password
   * @throws {AppError} If credentials are invalid
   */
  async login(username, password) {
    const user = await this.repository.findByUsername(username);
    
    if (!user) {
      throw unauthorized('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    
    if (!isPasswordValid) {
      throw unauthorized('Invalid credentials');
    }

    const role = user.role || 'admin';
    const token = jwt.sign(
      { id: user.id, username: user.username, role },
      this.jwtSecret,
      { expiresIn: this.jwtExpiresIn }
    );

    return { token, role };
  }

  /**
   * Verify JWT token and return user info
   * @param {string} token - JWT token
   * @throws {AppError} If token is invalid
   */
  verifyToken(token) {
    try {
      return jwt.verify(token, this.jwtSecret);
    } catch (err) {
      throw unauthorized('Invalid token');
    }
  }

  /**
   * Get current user info from token
   * @param {string} token - JWT token
   */
  async getCurrentUser(token) {
    const decoded = this.verifyToken(token);
    return {
      id: decoded.id,
      username: decoded.username,
      role: decoded.role || 'admin'
    };
  }
}

export const authService = new AuthService(userRepository);

