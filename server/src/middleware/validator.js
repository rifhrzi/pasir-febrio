import { badRequest } from '../utils/AppError.js';

/**
 * Validation Middleware Factory
 * Follows Single Responsibility Principle - only handles input validation
 * Follows Open/Closed Principle - extensible via schema definition
 */

/**
 * Transaction validation schema
 */
const transactionSchema = {
  trans_date: {
    required: true,
    type: 'string',
    message: 'Transaction date is required'
  },
  category: {
    required: true,
    type: 'string',
    message: 'Category is required'
  },
  amount: {
    required: true,
    type: 'number',
    transform: (val) => Number(val),
    validate: (val) => !isNaN(val) && val >= 0,
    message: 'Amount must be a valid positive number'
  },
  description: {
    required: false,
    type: 'string'
  },
  proof_image: {
    required: false,
    type: 'string'
  }
};

/**
 * Login validation schema
 */
const loginSchema = {
  username: {
    required: true,
    type: 'string',
    message: 'Username is required'
  },
  password: {
    required: true,
    type: 'string',
    message: 'Password is required'
  }
};

/**
 * Bulk import validation schema
 */
const bulkImportSchema = {
  items: {
    required: true,
    type: 'array',
    validate: (val) => Array.isArray(val) && val.length > 0,
    message: 'Items array is required and must not be empty'
  }
};

/**
 * Validate request body against schema
 * @param {Object} schema - Validation schema
 */
export const validate = (schema) => (req, res, next) => {
  const errors = [];

  for (const [field, rules] of Object.entries(schema)) {
    let value = req.body[field];

    // Transform value if needed
    if (rules.transform && value !== undefined) {
      value = rules.transform(value);
      req.body[field] = value;
    }

    // Check required
    if (rules.required && (value === undefined || value === null || value === '')) {
      errors.push(rules.message || `${field} is required`);
      continue;
    }

    // Skip validation if not required and empty
    if (!rules.required && (value === undefined || value === null || value === '')) {
      continue;
    }

    // Custom validation
    if (rules.validate && !rules.validate(value)) {
      errors.push(rules.message || `${field} is invalid`);
    }
  }

  if (errors.length > 0) {
    return next(badRequest(errors.join(', ')));
  }

  next();
};

// Pre-built validators
export const validateTransaction = validate(transactionSchema);
export const validateLogin = validate(loginSchema);
export const validateBulkImport = validate(bulkImportSchema);

