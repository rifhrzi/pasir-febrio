/**
 * Custom error class for operational errors
 * Follows Single Responsibility Principle - only handles app-specific errors
 */
export class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

// Common error factory methods
export const notFound = (resource = 'Resource') => 
  new AppError(`${resource} not found`, 404);

export const badRequest = (message = 'Bad request') => 
  new AppError(message, 400);

export const unauthorized = (message = 'Unauthorized') => 
  new AppError(message, 401);

export const forbidden = (message = 'Access denied') => 
  new AppError(message, 403);

export const serverError = (message = 'Internal server error') => 
  new AppError(message, 500);

