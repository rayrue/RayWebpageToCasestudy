const fs = require('fs');
const path = require('path');
const initSqlJs = require('sql.js');
const config = require('../config');
const logger = require('../utils/logger');
const { ExtractionError, ErrorTypes } = require('../utils/errors');

let db = null;
let SQL = null;

/**
 * Initialize the database and storage directories
 */
async function initialize() {
  // Ensure storage directories exist
  const storageDir = path.resolve(config.storagePath);
  const dataDir = path.dirname(path.resolve(config.dbPath));

  if (!fs.existsSync(storageDir)) {
    fs.mkdirSync(storageDir, { recursive: true });
    logger.info(`Created storage directory: ${storageDir}`);
  }

  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
    logger.info(`Created data directory: ${dataDir}`);
  }

  // Initialize SQL.js
  SQL = await initSqlJs();

  // Load existing database or create new one
  const dbPath = path.resolve(config.dbPath);
  if (fs.existsSync(dbPath)) {
    const fileBuffer = fs.readFileSync(dbPath);
    db = new SQL.Database(fileBuffer);
    logger.info('Loaded existing database');
  } else {
    db = new SQL.Database();
    logger.info('Created new database');
  }

  // Create tables
  db.run(`
    CREATE TABLE IF NOT EXISTS stories (
      story_id TEXT PRIMARY KEY,
      original_url TEXT NOT NULL,
      status TEXT DEFAULT 'processing',
      extracted_at TEXT,
      title TEXT,
      text_content TEXT,
      html_content TEXT,
      word_count INTEGER DEFAULT 0,
      read_time TEXT,
      metadata TEXT,
      error TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS batches (
      batch_id TEXT PRIMARY KEY,
      total_urls INTEGER DEFAULT 0,
      processed INTEGER DEFAULT 0,
      completed INTEGER DEFAULT 0,
      failed INTEGER DEFAULT 0,
      story_ids TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`CREATE INDEX IF NOT EXISTS idx_stories_status ON stories(status)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_stories_url ON stories(original_url)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_batches_created ON batches(created_at)`);

  // Save database to disk
  saveDatabase();

  logger.info('Database initialized successfully');
}

/**
 * Save database to disk
 */
function saveDatabase() {
  if (db) {
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(path.resolve(config.dbPath), buffer);
  }
}

/**
 * Get database instance
 */
function getDb() {
  if (!db) {
    throw new Error('Database not initialized. Call initialize() first.');
  }
  return db;
}

/**
 * Save a story to the database
 * @param {Object} storyData - Story data to save
 */
function saveStory(storyData) {
  const database = getDb();

  // Check if story exists
  const existing = database.exec(
    `SELECT story_id FROM stories WHERE story_id = ?`, [storyData.storyId]
  );

  if (existing.length > 0 && existing[0].values.length > 0) {
    // Update existing
    database.run(`
      UPDATE stories SET
        original_url = ?,
        status = ?,
        extracted_at = ?,
        title = ?,
        text_content = ?,
        html_content = ?,
        word_count = ?,
        read_time = ?,
        metadata = ?,
        error = ?,
        updated_at = datetime('now')
      WHERE story_id = ?
    `, [
      storyData.originalUrl,
      storyData.status,
      storyData.extractedAt,
      storyData.content?.title || null,
      storyData.content?.textOnly || null,
      storyData.content?.htmlStructured || null,
      storyData.content?.wordCount || 0,
      storyData.content?.estimatedReadTime || null,
      storyData.content?.metadata ? JSON.stringify(storyData.content.metadata) : null,
      storyData.error || null,
      storyData.storyId
    ]);
  } else {
    // Insert new
    database.run(`
      INSERT INTO stories
      (story_id, original_url, status, extracted_at, title, text_content, html_content,
       word_count, read_time, metadata, error)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      storyData.storyId,
      storyData.originalUrl,
      storyData.status,
      storyData.extractedAt,
      storyData.content?.title || null,
      storyData.content?.textOnly || null,
      storyData.content?.htmlStructured || null,
      storyData.content?.wordCount || 0,
      storyData.content?.estimatedReadTime || null,
      storyData.content?.metadata ? JSON.stringify(storyData.content.metadata) : null,
      storyData.error || null
    ]);
  }

  saveDatabase();
  logger.debug(`Saved story to database: ${storyData.storyId}`);
}

/**
 * Get a story from the database
 * @param {string} storyId - Story ID to retrieve
 * @returns {Object|null} Story data or null
 */
function getStory(storyId) {
  const database = getDb();

  const result = database.exec(`SELECT * FROM stories WHERE story_id = ?`, [storyId]);

  if (!result.length || !result[0].values.length) {
    return null;
  }

  const columns = result[0].columns;
  const values = result[0].values[0];
  const row = {};
  columns.forEach((col, i) => {
    row[col] = values[i];
  });

  return {
    storyId: row.story_id,
    originalUrl: row.original_url,
    status: row.status,
    extractedAt: row.extracted_at,
    content: {
      title: row.title,
      textOnly: row.text_content,
      htmlStructured: row.html_content,
      wordCount: row.word_count,
      estimatedReadTime: row.read_time,
      metadata: row.metadata ? JSON.parse(row.metadata) : null,
    },
    error: row.error,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Update story status
 * @param {string} storyId - Story ID
 * @param {string} status - New status
 * @param {string} error - Error message (optional)
 */
function updateStoryStatus(storyId, status, error = null) {
  const database = getDb();

  database.run(`
    UPDATE stories
    SET status = ?, error = ?, updated_at = datetime('now')
    WHERE story_id = ?
  `, [status, error, storyId]);

  saveDatabase();
}

/**
 * Save a batch to the database
 * @param {Object} batchData - Batch data to save
 */
function saveBatch(batchData) {
  const database = getDb();

  // Check if batch exists
  const existing = database.exec(
    `SELECT batch_id FROM batches WHERE batch_id = ?`, [batchData.batchId]
  );

  if (existing.length > 0 && existing[0].values.length > 0) {
    // Update existing
    database.run(`
      UPDATE batches SET
        total_urls = ?,
        processed = ?,
        completed = ?,
        failed = ?,
        story_ids = ?,
        updated_at = datetime('now')
      WHERE batch_id = ?
    `, [
      batchData.totalUrls,
      batchData.processed || 0,
      batchData.completed || 0,
      batchData.failed || 0,
      JSON.stringify(batchData.stories || []),
      batchData.batchId
    ]);
  } else {
    // Insert new
    database.run(`
      INSERT INTO batches
      (batch_id, total_urls, processed, completed, failed, story_ids)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [
      batchData.batchId,
      batchData.totalUrls,
      batchData.processed || 0,
      batchData.completed || 0,
      batchData.failed || 0,
      JSON.stringify(batchData.stories || [])
    ]);
  }

  saveDatabase();
  logger.debug(`Saved batch to database: ${batchData.batchId}`);
}

/**
 * Get a batch from the database
 * @param {string} batchId - Batch ID to retrieve
 * @returns {Object|null} Batch data or null
 */
function getBatch(batchId) {
  const database = getDb();

  const result = database.exec(`SELECT * FROM batches WHERE batch_id = ?`, [batchId]);

  if (!result.length || !result[0].values.length) {
    return null;
  }

  const columns = result[0].columns;
  const values = result[0].values[0];
  const row = {};
  columns.forEach((col, i) => {
    row[col] = values[i];
  });

  return {
    batchId: row.batch_id,
    totalUrls: row.total_urls,
    processed: row.processed,
    completed: row.completed,
    failed: row.failed,
    stories: row.story_ids ? JSON.parse(row.story_ids) : [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Update batch progress
 * @param {string} batchId - Batch ID
 * @param {Object} updates - Fields to update
 */
function updateBatch(batchId, updates) {
  const database = getDb();

  const fields = [];
  const values = [];

  if (updates.processed !== undefined) {
    fields.push('processed = ?');
    values.push(updates.processed);
  }
  if (updates.completed !== undefined) {
    fields.push('completed = ?');
    values.push(updates.completed);
  }
  if (updates.failed !== undefined) {
    fields.push('failed = ?');
    values.push(updates.failed);
  }
  if (updates.stories !== undefined) {
    fields.push('story_ids = ?');
    values.push(JSON.stringify(updates.stories));
  }

  fields.push("updated_at = datetime('now')");
  values.push(batchId);

  database.run(`UPDATE batches SET ${fields.join(', ')} WHERE batch_id = ?`, values);
  saveDatabase();
}

/**
 * Get story directory path
 * @param {string} storyId - Story ID
 * @returns {string} Directory path
 */
function getStoryDir(storyId) {
  return path.join(path.resolve(config.storagePath), storyId);
}

/**
 * Save HTML files for a story
 * @param {string} storyId - Story ID
 * @param {string} standardHtml - Standard HTML content
 * @param {string} pdfReadyHtml - PDF-ready HTML content
 */
function saveHtmlFiles(storyId, standardHtml, pdfReadyHtml) {
  const storyDir = getStoryDir(storyId);

  try {
    if (!fs.existsSync(storyDir)) {
      fs.mkdirSync(storyDir, { recursive: true });
    }

    fs.writeFileSync(path.join(storyDir, 'index.html'), standardHtml, 'utf8');
    fs.writeFileSync(path.join(storyDir, 'pdf-ready.html'), pdfReadyHtml, 'utf8');

    logger.debug(`Saved HTML files for story: ${storyId}`);
  } catch (error) {
    throw new ExtractionError(
      ErrorTypes.STORAGE_ERROR,
      `Failed to save HTML files: ${error.message}`,
      { storyId }
    );
  }
}

/**
 * Get HTML file content
 * @param {string} storyId - Story ID
 * @param {string} filename - File name (index.html or pdf-ready.html)
 * @returns {string|null} File content or null
 */
function getHtmlFile(storyId, filename = 'index.html') {
  const filePath = path.join(getStoryDir(storyId), filename);

  try {
    if (fs.existsSync(filePath)) {
      return fs.readFileSync(filePath, 'utf8');
    }
  } catch (error) {
    logger.error(`Error reading HTML file: ${error.message}`);
  }

  return null;
}

/**
 * Save batch dashboard HTML
 * @param {string} batchId - Batch ID
 * @param {string} html - Dashboard HTML content
 */
function saveBatchDashboard(batchId, html) {
  const batchDir = path.join(path.resolve(config.storagePath), 'batches', batchId);

  try {
    if (!fs.existsSync(batchDir)) {
      fs.mkdirSync(batchDir, { recursive: true });
    }

    fs.writeFileSync(path.join(batchDir, 'index.html'), html, 'utf8');
    logger.debug(`Saved batch dashboard: ${batchId}`);
  } catch (error) {
    logger.error(`Failed to save batch dashboard: ${error.message}`);
  }
}

/**
 * Close the database connection
 */
function close() {
  if (db) {
    saveDatabase();
    db.close();
    db = null;
    logger.info('Database connection closed');
  }
}

module.exports = {
  initialize,
  getDb,
  saveStory,
  getStory,
  updateStoryStatus,
  saveBatch,
  getBatch,
  updateBatch,
  getStoryDir,
  saveHtmlFiles,
  getHtmlFile,
  saveBatchDashboard,
  close,
};
