// Jest setup file

// Set test environment
process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL = 'error'; // Reduce noise during tests
process.env.STORAGE_PATH = './test-stories';
process.env.DB_PATH = './test-data/test.db';

// Cleanup after all tests
afterAll(async () => {
  const fs = require('fs');
  const path = require('path');

  // Clean up test directories
  const testDirs = ['./test-stories', './test-data'];

  for (const dir of testDirs) {
    if (fs.existsSync(dir)) {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  }
});
