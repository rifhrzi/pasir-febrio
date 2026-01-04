import express from 'express';
import { authController } from '../controllers/auth.controller.js';

const router = express.Router();

/**
 * Auth Routes
 * POST /api/auth/login - User login
 * GET /api/auth/me - Get current user info
 */
router.post('/login', authController.login);
router.get('/me', authController.getCurrentUser);

export default router;

