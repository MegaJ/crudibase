import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

/**
 * Get database path (read from environment each time)
 */
function getDatabasePath(): string {
  return process.env.DATABASE_PATH || './data/crudibase.db';
}

/**
 * Initialize SQLite database connection
 */
export function initDatabase(): Database.Database {
  const DATABASE_PATH = getDatabasePath();

  // Ensure data directory exists (skip for :memory: databases)
  if (DATABASE_PATH !== ':memory:') {
    const dbDir = path.dirname(DATABASE_PATH);
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }
  }

  const db = new Database(DATABASE_PATH);

  // Enable WAL mode for better concurrency
  db.pragma('journal_mode = WAL');

  // Enable foreign keys
  db.pragma('foreign_keys = ON');

  return db;
}

/**
 * Run database migrations
 */
export function runMigrations(db: Database.Database): void {
  // Create users table
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      email_verified INTEGER DEFAULT 0,
      reset_token TEXT,
      reset_token_expires DATETIME
    );
  `);

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
  `);

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_users_reset_token ON users(reset_token);
  `);

  // Create sessions table
  db.exec(`
    CREATE TABLE IF NOT EXISTS sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      token TEXT NOT NULL,
      expires_at DATETIME NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token);
  `);

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
  `);

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);
  `);

  // Create api_tokens table
  db.exec(`
    CREATE TABLE IF NOT EXISTS api_tokens (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      service TEXT NOT NULL,
      token TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE(user_id, service)
    );
  `);

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_api_tokens_user_id ON api_tokens(user_id);
  `);

  // Create collections table
  db.exec(`
    CREATE TABLE IF NOT EXISTS collections (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      is_public INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_collections_user_id ON collections(user_id);
  `);

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_collections_public ON collections(is_public);
  `);

  // Create collection_items table
  db.exec(`
    CREATE TABLE IF NOT EXISTS collection_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      collection_id INTEGER NOT NULL,
      entity_id TEXT NOT NULL,
      entity_label TEXT,
      entity_description TEXT,
      notes TEXT,
      added_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (collection_id) REFERENCES collections(id) ON DELETE CASCADE,
      UNIQUE(collection_id, entity_id)
    );
  `);

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_collection_items_collection_id ON collection_items(collection_id);
  `);

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_collection_items_entity_id ON collection_items(entity_id);
  `);

  // Create search_cache table
  db.exec(`
    CREATE TABLE IF NOT EXISTS search_cache (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      query_hash TEXT UNIQUE NOT NULL,
      query TEXT NOT NULL,
      results TEXT NOT NULL,
      cached_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      expires_at DATETIME NOT NULL
    );
  `);

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_search_cache_query_hash ON search_cache(query_hash);
  `);

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_search_cache_expires_at ON search_cache(expires_at);
  `);

  console.log('✅ Database migrations completed successfully');
}

/**
 * Get database instance (singleton)
 */
let dbInstance: Database.Database | null = null;
let currentDbPath: string | null = null;

export function getDatabase(): Database.Database {
  const dbPath = getDatabasePath();

  // If database path changed or no instance exists, create new instance
  if (!dbInstance || currentDbPath !== dbPath) {
    // Close existing instance if it exists
    if (dbInstance) {
      dbInstance.close();
    }

    dbInstance = initDatabase();
    runMigrations(dbInstance);
    currentDbPath = dbPath;
  }

  return dbInstance;
}

/**
 * Close database connection
 */
export function closeDatabase(): void {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
    currentDbPath = null;
  }
}
