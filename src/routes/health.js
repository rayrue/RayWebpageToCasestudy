const express = require('express');
const router = express.Router();

const storageService = require('../services/storageService');
const config = require('../config');

/**
 * GET /health
 * Health check endpoint
 */
router.get('/', (req, res) => {
  const healthCheck = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: config.nodeEnv,
    version: process.env.npm_package_version || '1.0.0',
  };

  res.status(200).json(healthCheck);
});

/**
 * GET /health/detailed
 * Detailed health check with database status
 */
router.get('/detailed', (req, res) => {
  let dbStatus = 'unknown';

  try {
    const db = storageService.getDb();
    // Simple query to check database
    db.prepare('SELECT 1').get();
    dbStatus = 'connected';
  } catch (error) {
    dbStatus = 'error';
  }

  const healthCheck = {
    status: dbStatus === 'connected' ? 'healthy' : 'degraded',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: config.nodeEnv,
    version: process.env.npm_package_version || '1.0.0',
    services: {
      database: dbStatus,
      storage: config.storagePath,
    },
    config: {
      maxRetries: config.maxRetries,
      fetchTimeout: config.fetchTimeout,
      maxConcurrentWorkers: config.maxConcurrentWorkers,
    },
  };

  const statusCode = healthCheck.status === 'healthy' ? 200 : 503;
  res.status(statusCode).json(healthCheck);
});

module.exports = router;
