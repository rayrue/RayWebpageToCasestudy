/**
 * Custom error types for the extraction service
 */

const ErrorTypes = {
  INVALID_URL: 'INVALID_URL',
  EXTRACTION_FAILED: 'EXTRACTION_FAILED',
  PARSE_ERROR: 'PARSE_ERROR',
  TIMEOUT: 'TIMEOUT',
  RATE_LIMITED: 'RATE_LIMITED',
  NOT_FOUND: 'NOT_FOUND',
  STORAGE_ERROR: 'STORAGE_ERROR',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  UNKNOWN: 'UNKNOWN',
};

const ErrorMessages = {
  [ErrorTypes.INVALID_URL]: 'URL format invalid or unreachable',
  [ErrorTypes.EXTRACTION_FAILED]: 'Unable to extract content from page',
  [ErrorTypes.PARSE_ERROR]: 'Error parsing HTML content',
  [ErrorTypes.TIMEOUT]: 'Request timed out',
  [ErrorTypes.RATE_LIMITED]: 'Too many requests, backing off',
  [ErrorTypes.NOT_FOUND]: 'Story not found',
  [ErrorTypes.STORAGE_ERROR]: 'Error storing or retrieving data',
  [ErrorTypes.VALIDATION_ERROR]: 'Validation failed',
  [ErrorTypes.UNKNOWN]: 'An unexpected error occurred',
};

const RetryableErrors = [ErrorTypes.TIMEOUT, ErrorTypes.RATE_LIMITED];

class ExtractionError extends Error {
  constructor(type, message, details = {}) {
    super(message || ErrorMessages[type] || ErrorMessages[ErrorTypes.UNKNOWN]);
    this.name = 'ExtractionError';
    this.type = type;
    this.details = details;
    this.retryable = RetryableErrors.includes(type);
    this.timestamp = new Date().toISOString();
  }

  toJSON() {
    return {
      error: this.type,
      message: this.message,
      retryable: this.retryable,
      details: this.details,
      timestamp: this.timestamp,
    };
  }
}

/**
 * Helper function to determine if an error is retryable
 */
function isRetryable(error) {
  if (error instanceof ExtractionError) {
    return error.retryable;
  }
  // Axios timeout errors
  if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
    return true;
  }
  // Rate limiting from servers
  if (error.response && error.response.status === 429) {
    return true;
  }
  return false;
}

/**
 * Calculate exponential backoff delay
 */
function getBackoffDelay(attempt, baseDelay = 1000) {
  return Math.pow(3, attempt - 1) * baseDelay; // 1s, 3s, 9s
}

module.exports = {
  ErrorTypes,
  ErrorMessages,
  ExtractionError,
  isRetryable,
  getBackoffDelay,
};
