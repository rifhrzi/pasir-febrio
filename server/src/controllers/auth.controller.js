import { asyncHandler } from '../utils/asyncHandler.js';
import { sendSuccess } from '../utils/responseHelper.js';
import { badRequest } from '../utils/AppError.js';
import { authService } from '../services/auth.service.js';

/**
 * Auth Controller
 * Follows Single Responsibility Principle - only handles HTTP request/response for auth
 */
export const authController = {
  /**
   * POST /login - User login
   */
  login: asyncHandler(async (req, res) => {
    const { username, password } = req.body;
    
    if (!username || !password) {
      throw badRequest('Username & password required');
    }

    const { token, role } = await authService.login(username, password);
    sendSuccess(res, { token, role });
  }),

  /**
   * GET /me - Get current user info
   */
  getCurrentUser: asyncHandler(async (req, res) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      throw badRequest('No token provided');
    }

    const user = await authService.getCurrentUser(token);
    sendSuccess(res, user);
  })
};

