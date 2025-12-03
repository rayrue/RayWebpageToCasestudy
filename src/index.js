const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const path = require('path');

const config = require('./config');
const logger = require('./utils/logger');
const storageService = require('./services/storageService');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');

// Import routes
const extractRoutes = require('./routes/extract');
const storyRoutes = require('./routes/story');
const healthRoutes = require('./routes/health');

// Initialize Express app
const app = express();

// Trust proxy (for rate limiting behind reverse proxies)
app.set('trust proxy', 1);

// Security middleware
app.use(helmet({
  contentSecurityPolicy: false, // Disable for serving generated HTML
  crossOriginEmbedderPolicy: false,
}));

// CORS configuration
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : '*',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Request logging
app.use(morgan('combined', {
  stream: {
    write: (message) => logger.info(message.trim()),
  },
}));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting
const limiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.maxRequests,
  message: {
    success: false,
    error: 'RATE_LIMITED',
    message: 'Too many requests, please try again later',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api', limiter);

// Static file serving for generated HTML pages
app.use('/stories', express.static(path.resolve(config.storagePath), {
  extensions: ['html'],
  index: 'index.html',
}));

// Batch dashboard serving
app.use('/batches', express.static(path.join(path.resolve(config.storagePath), 'batches'), {
  extensions: ['html'],
  index: 'index.html',
}));

// API Routes
app.use('/api/extract', extractRoutes);
app.use('/api/story', storyRoutes);
app.use('/health', healthRoutes);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    name: 'Customer Story Extraction Service',
    version: '1.0.0',
    status: 'running',
    endpoints: {
      extract: {
        single: 'POST /api/extract/single',
        batch: 'POST /api/extract/batch',
      },
      retrieve: {
        story: 'GET /api/story/:storyId',
        batch: 'GET /api/story/batch/:batchId',
        retryBatch: 'POST /api/story/batch/:batchId/retry',
      },
      health: {
        basic: 'GET /health',
        detailed: 'GET /health/detailed',
      },
      files: {
        storyHtml: 'GET /stories/:storyId/index.html',
        pdfReady: 'GET /stories/:storyId/pdf-ready.html',
        batchDashboard: 'GET /batches/:batchId',
      },
    },
    documentation: 'See README.md for full API documentation',
  });
});

// Error handlers
app.use(notFoundHandler);
app.use(errorHandler);

// Initialize storage and start server
async function start() {
  try {
    // Initialize storage (database + directories)
    logger.info('Initializing storage...');
    await storageService.initialize();

    // Start server
    const server = app.listen(config.port, () => {
      logger.info(`Server running on port ${config.port}`);
      logger.info(`Environment: ${config.nodeEnv}`);
      logger.info(`Base URL: ${config.baseUrl}`);
      logger.info(`Storage path: ${path.resolve(config.storagePath)}`);
    });

    // Graceful shutdown
    const shutdown = (signal) => {
      logger.info(`${signal} received, shutting down gracefully...`);

      server.close(() => {
        logger.info('HTTP server closed');
        storageService.close();
        process.exit(0);
      });

      // Force shutdown after 10 seconds
      setTimeout(() => {
        logger.error('Forced shutdown after timeout');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Start the server
start();

module.exports = app;
