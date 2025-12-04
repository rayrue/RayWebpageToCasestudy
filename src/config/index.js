require('dotenv').config();

const config = {
  // Server
  port: parseInt(process.env.PORT, 10) || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  baseUrl: process.env.BASE_URL || 'http://localhost:3000',

  // Extraction
  maxRetries: parseInt(process.env.MAX_RETRIES, 10) || 3,
  fetchTimeout: parseInt(process.env.FETCH_TIMEOUT, 10) || 30000,
  userAgent: process.env.USER_AGENT || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',

  // Batch Processing
  maxConcurrentWorkers: parseInt(process.env.MAX_CONCURRENT_WORKERS, 10) || 5,

  // Storage
  storagePath: process.env.STORAGE_PATH || './stories',
  dbPath: process.env.DB_PATH || './data/stories.db',

  // Anthropic AI
  anthropic: {
    apiKey: process.env.ANTHROPIC_API_KEY || '',
    model: process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-20250514',
  },

  // URL Box
  urlbox: {
    apiKey: process.env.URLBOX_API_KEY || '',
    screenshotWidth: parseInt(process.env.URLBOX_SCREENSHOT_WIDTH, 10) || 1280,
    screenshotHeight: parseInt(process.env.URLBOX_SCREENSHOT_HEIGHT, 10) || 1024,
  },

  // Gamma
  gamma: {
    apiKey: process.env.GAMMA_API_KEY || '',
    baseUrl: 'https://public-api.gamma.app/v1.0',
    defaultThemeId: process.env.GAMMA_DEFAULT_THEME_ID || null,
  },

  // Brandfetch
  brandfetch: {
    apiKey: process.env.BRANDFETCH_API_KEY || '',
  },

  // Rate Limiting
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 60000,
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS, 10) || 100,
  },

  // Logging
  logLevel: process.env.LOG_LEVEL || 'info',
};

module.exports = config;
