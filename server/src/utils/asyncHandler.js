/**
 * Async handler wrapper to eliminate try-catch boilerplate
 * Follows DRY principle - centralized error catching
 * @param {Function} fn - Async route handler function
 * @returns {Function} Express middleware function
 */
export const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

