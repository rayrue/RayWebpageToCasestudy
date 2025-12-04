const express = require('express');
const multer = require('multer');
const csv = require('csv-parser');
const { Readable } = require('stream');
const router = express.Router();

const orchestrationService = require('../services/orchestrationService');
const gammaService = require('../services/gammaService');
const { validateSingleExtract, validateBatchExtract } = require('../middleware/validation');
const { isValidUrl } = require('../utils/helpers');
const logger = require('../utils/logger');

// Configure multer for CSV upload
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max
  },
  fileFilter: (req, file, cb) => {
    const allowedMimeTypes = ['text/csv', 'application/csv', 'text/plain'];
    if (allowedMimeTypes.includes(file.mimetype) || file.originalname.endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV files are allowed'));
    }
  },
});

/**
 * POST /api/extract/single
 * Extract content from a single URL
 *
 * Body parameters:
 * - url: The URL to extract content from
 * - options.useGamma: If true, also generate a Gamma document
 * - options.gammaThemeId: Gamma theme ID to use (optional)
 * - options.gammaFormat: 'document', 'presentation', or 'webpage' (default: 'document')
 * - options.logoUrl: URL to customer logo for Gamma header (optional)
 */
router.post('/single', validateSingleExtract, async (req, res, next) => {
  try {
    const { url, options = {} } = req.body;

    // Extract Gamma-specific options
    const processingOptions = {
      ...options,
      useGamma: options.useGamma || false,
      gammaThemeId: options.gammaThemeId || null,
      gammaFormat: options.gammaFormat || 'document',
      logoUrl: options.logoUrl || null,
    };

    logger.info(`Single extraction request: ${url} (useGamma: ${processingOptions.useGamma})`);

    const result = await orchestrationService.processSingleUrl(url, processingOptions);

    if (result.success) {
      res.status(200).json(result);
    } else {
      res.status(422).json(result);
    }
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/extract/batch
 * Extract content from multiple URLs via CSV upload
 */
router.post('/batch', upload.single('file'), validateBatchExtract, async (req, res, next) => {
  try {
    logger.info('Batch extraction request received');

    // Parse CSV from buffer
    const urlList = await parseCSV(req.file.buffer);

    if (urlList.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'VALIDATION_ERROR',
        message: 'No valid URLs found in CSV file',
      });
    }

    // Validate URLs
    const invalidUrls = urlList.filter(item => !isValidUrl(item.url));
    if (invalidUrls.length > 0) {
      logger.warn(`Found ${invalidUrls.length} invalid URLs in batch`);
    }

    // Filter to only valid URLs
    const validUrls = urlList.filter(item => isValidUrl(item.url));

    if (validUrls.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'VALIDATION_ERROR',
        message: 'No valid URLs found in CSV file',
      });
    }

    logger.info(`Processing batch of ${validUrls.length} URLs`);

    const result = await orchestrationService.processBatch(validUrls);

    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * Parse CSV buffer into array of URL objects
 * @param {Buffer} buffer - CSV file buffer
 * @returns {Promise<Array>} Array of {url, name, priority} objects
 */
function parseCSV(buffer) {
  return new Promise((resolve, reject) => {
    const results = [];

    const stream = Readable.from(buffer.toString());

    stream
      .pipe(csv({
        mapHeaders: ({ header }) => header.toLowerCase().trim(),
      }))
      .on('data', (row) => {
        // Support multiple column names for URL
        const url = row.url || row.link || row.website || row.page;

        if (url) {
          results.push({
            url: url.trim(),
            name: (row.name || row.title || row.company || '').trim() || null,
            priority: (row.priority || 'medium').toLowerCase().trim(),
          });
        }
      })
      .on('end', () => {
        resolve(results);
      })
      .on('error', (error) => {
        reject(error);
      });
  });
}

/**
 * GET /api/extract/gamma/themes
 * List available Gamma themes
 */
router.get('/gamma/themes', async (req, res, next) => {
  try {
    if (!gammaService.isGammaEnabled()) {
      return res.status(503).json({
        success: false,
        error: 'GAMMA_NOT_CONFIGURED',
        message: 'Gamma API key is not configured',
      });
    }

    const themes = await gammaService.listThemes();

    res.status(200).json({
      success: true,
      themes: themes.map(t => ({
        id: t.id,
        name: t.name,
        type: t.type,
        colorKeywords: t.colorKeywords,
        toneKeywords: t.toneKeywords,
      })),
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
