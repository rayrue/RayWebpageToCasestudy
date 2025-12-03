const { isValidUrl } = require('../utils/helpers');
const { ExtractionError, ErrorTypes } = require('../utils/errors');

/**
 * Validate single URL extraction request
 */
function validateSingleExtract(req, res, next) {
  const { url, options = {} } = req.body;

  // URL is required
  if (!url) {
    return res.status(400).json({
      success: false,
      error: 'VALIDATION_ERROR',
      message: 'URL is required',
    });
  }

  // Validate URL format
  if (!isValidUrl(url)) {
    return res.status(400).json({
      success: false,
      error: 'INVALID_URL',
      message: 'Invalid URL format. Must be a valid HTTP or HTTPS URL.',
    });
  }

  // Validate options if provided
  if (options.timeout !== undefined) {
    const timeout = parseInt(options.timeout, 10);
    if (isNaN(timeout) || timeout < 1000 || timeout > 120000) {
      return res.status(400).json({
        success: false,
        error: 'VALIDATION_ERROR',
        message: 'Timeout must be between 1000 and 120000 milliseconds',
      });
    }
    req.body.options.timeout = timeout;
  }

  if (options.maxRetries !== undefined) {
    const maxRetries = parseInt(options.maxRetries, 10);
    if (isNaN(maxRetries) || maxRetries < 0 || maxRetries > 10) {
      return res.status(400).json({
        success: false,
        error: 'VALIDATION_ERROR',
        message: 'maxRetries must be between 0 and 10',
      });
    }
    req.body.options.maxRetries = maxRetries;
  }

  next();
}

/**
 * Validate batch extraction request
 */
function validateBatchExtract(req, res, next) {
  // Check if file was uploaded
  if (!req.file) {
    return res.status(400).json({
      success: false,
      error: 'VALIDATION_ERROR',
      message: 'CSV file is required. Upload using field name "file".',
    });
  }

  // Check file type
  const allowedMimeTypes = ['text/csv', 'application/csv', 'text/plain'];
  if (!allowedMimeTypes.includes(req.file.mimetype)) {
    return res.status(400).json({
      success: false,
      error: 'VALIDATION_ERROR',
      message: 'Invalid file type. Only CSV files are accepted.',
    });
  }

  next();
}

/**
 * Validate story ID parameter
 */
function validateStoryId(req, res, next) {
  const { storyId } = req.params;

  if (!storyId) {
    return res.status(400).json({
      success: false,
      error: 'VALIDATION_ERROR',
      message: 'Story ID is required',
    });
  }

  // Basic format validation
  if (!storyId.startsWith('story_') || storyId.length < 10) {
    return res.status(400).json({
      success: false,
      error: 'VALIDATION_ERROR',
      message: 'Invalid story ID format',
    });
  }

  next();
}

/**
 * Validate batch ID parameter
 */
function validateBatchId(req, res, next) {
  const { batchId } = req.params;

  if (!batchId) {
    return res.status(400).json({
      success: false,
      error: 'VALIDATION_ERROR',
      message: 'Batch ID is required',
    });
  }

  // Basic format validation
  if (!batchId.startsWith('batch_') || batchId.length < 10) {
    return res.status(400).json({
      success: false,
      error: 'VALIDATION_ERROR',
      message: 'Invalid batch ID format',
    });
  }

  next();
}

module.exports = {
  validateSingleExtract,
  validateBatchExtract,
  validateStoryId,
  validateBatchId,
};
