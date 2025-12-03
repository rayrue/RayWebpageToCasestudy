const express = require('express');
const router = express.Router();

const orchestrationService = require('../services/orchestrationService');
const { validateStoryId, validateBatchId } = require('../middleware/validation');
const logger = require('../utils/logger');

/**
 * GET /api/story/:storyId
 * Retrieve a generated story by ID
 */
router.get('/:storyId', validateStoryId, async (req, res, next) => {
  try {
    const { storyId } = req.params;

    logger.info(`Story retrieval request: ${storyId}`);

    const story = orchestrationService.getStoryStatus(storyId);

    if (!story) {
      return res.status(404).json({
        success: false,
        error: 'NOT_FOUND',
        message: `Story not found: ${storyId}`,
      });
    }

    res.status(200).json({
      success: true,
      ...story,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/batch/:batchId
 * Retrieve batch status and results
 */
router.get('/batch/:batchId', validateBatchId, async (req, res, next) => {
  try {
    const { batchId } = req.params;

    logger.info(`Batch status request: ${batchId}`);

    const batch = orchestrationService.getBatchStatus(batchId);

    if (!batch) {
      return res.status(404).json({
        success: false,
        error: 'NOT_FOUND',
        message: `Batch not found: ${batchId}`,
      });
    }

    res.status(200).json({
      success: true,
      ...batch,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/batch/:batchId/retry
 * Retry failed stories in a batch
 */
router.post('/batch/:batchId/retry', validateBatchId, async (req, res, next) => {
  try {
    const { batchId } = req.params;

    logger.info(`Batch retry request: ${batchId}`);

    const result = await orchestrationService.retryFailedStories(batchId);

    res.status(200).json({
      success: true,
      ...result,
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
