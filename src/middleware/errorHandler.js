const logger = require('../utils/logger');
const { ExtractionError, ErrorTypes } = require('../utils/errors');

/**
 * Global error handling middleware
 */
function errorHandler(err, req, res, next) {
  // Log the error
  logger.error('Request error:', {
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
  });

  // Handle ExtractionError
  if (err instanceof ExtractionError) {
    return res.status(getStatusCode(err.type)).json({
      success: false,
      error: err.type,
      message: err.message,
      retryable: err.retryable,
      details: err.details,
    });
  }

  // Handle multer errors (file upload)
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({
      success: false,
      error: 'FILE_TOO_LARGE',
      message: 'File size exceeds the maximum allowed limit',
    });
  }

  if (err.code === 'LIMIT_UNEXPECTED_FILE') {
    return res.status(400).json({
      success: false,
      error: 'INVALID_FIELD',
      message: 'Unexpected file field in upload',
    });
  }

  // Handle validation errors
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      error: 'VALIDATION_ERROR',
      message: err.message,
    });
  }

  // Handle JSON parse errors
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({
      success: false,
      error: 'INVALID_JSON',
      message: 'Invalid JSON in request body',
    });
  }

  // Default 500 error
  res.status(500).json({
    success: false,
    error: 'INTERNAL_ERROR',
    message: process.env.NODE_ENV === 'production'
      ? 'An unexpected error occurred'
      : err.message,
  });
}

/**
 * Map error types to HTTP status codes
 */
function getStatusCode(errorType) {
  const statusCodes = {
    [ErrorTypes.INVALID_URL]: 400,
    [ErrorTypes.VALIDATION_ERROR]: 400,
    [ErrorTypes.NOT_FOUND]: 404,
    [ErrorTypes.RATE_LIMITED]: 429,
    [ErrorTypes.EXTRACTION_FAILED]: 422,
    [ErrorTypes.PARSE_ERROR]: 422,
    [ErrorTypes.TIMEOUT]: 408,
    [ErrorTypes.STORAGE_ERROR]: 500,
    [ErrorTypes.UNKNOWN]: 500,
  };

  return statusCodes[errorType] || 500;
}

/**
 * 404 handler for unknown routes
 */
function notFoundHandler(req, res) {
  res.status(404).json({
    success: false,
    error: 'NOT_FOUND',
    message: `Route not found: ${req.method} ${req.path}`,
  });
}

module.exports = {
  errorHandler,
  notFoundHandler,
};
