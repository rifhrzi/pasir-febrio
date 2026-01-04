import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import { unauthorized, forbidden } from '../utils/AppError.js';

dotenv.config();

/**
 * Middleware to verify JWT token
 * Follows Single Responsibility Principle - only handles token verification
 */
export const verifyToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return next(unauthorized('No token provided'));
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return next(forbidden('Invalid token'));
  }
};

/**
 * Middleware to check if user has admin role
 * Follows Single Responsibility Principle - only handles admin authorization
 */
export const requireAdmin = (req, res, next) => {
  if (!req.user) {
    return next(unauthorized('Not authenticated'));
  }
  
  const role = req.user.role || 'admin';
  if (role !== 'admin') {
    return next(forbidden('Access denied. Admin role required.'));
  }
  
  next();
};

/**
 * Middleware to check if user can view (admin or viewer)
 */
export const requireViewer = (req, res, next) => {
  if (!req.user) {
    return next(unauthorized('Not authenticated'));
  }
  
  const role = req.user.role || 'admin';
  if (role !== 'admin' && role !== 'viewer') {
    return next(forbidden('Access denied.'));
  }
  
  next();
};

