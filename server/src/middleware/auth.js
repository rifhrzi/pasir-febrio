import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

export function verifyToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.status(401).json({ message: 'No token provided' });

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ message: 'Invalid token' });
    req.user = user;
    next();
  });
}

// Middleware to check if user has admin role (can add/edit/delete)
export function requireAdmin(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ message: 'Not authenticated' });
  }
  
  const role = req.user.role || 'admin'; // Default to admin for backwards compatibility
  if (role !== 'admin') {
    return res.status(403).json({ message: 'Access denied. Admin role required.' });
  }
  
  next();
}

// Middleware to check if user can view (both admin and viewer can view)
export function requireViewer(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ message: 'Not authenticated' });
  }
  
  const role = req.user.role || 'admin';
  if (role !== 'admin' && role !== 'viewer') {
    return res.status(403).json({ message: 'Access denied.' });
  }
  
  next();
}