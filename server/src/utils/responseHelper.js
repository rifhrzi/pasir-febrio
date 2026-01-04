/**
 * Standardized response helpers
 * Follows Single Responsibility Principle - only handles response formatting
 */

export const sendSuccess = (res, data, statusCode = 200) => {
  res.status(statusCode).json({
    success: true,
    data
  });
};

export const sendCreated = (res, data) => {
  sendSuccess(res, data, 201);
};

export const sendNoContent = (res) => {
  res.status(204).send();
};

export const sendError = (res, message, statusCode = 500) => {
  res.status(statusCode).json({
    success: false,
    message
  });
};

export const sendPaginated = (res, data, pagination) => {
  res.status(200).json({
    success: true,
    data,
    pagination
  });
};

