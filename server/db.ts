import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from "@shared/schema";
import fs from 'fs';

console.log('Connecting to database...');

// Ensure database directory exists
const dbDir = './database';
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

// Create or connect to SQLite database
const sqlite = new Database('./database/nexxauth.sqlite');
sqlite.pragma('journal_mode = WAL');

// Auto-initialize database schema and handle migrations
const initializeDatabase = () => {
  const runMigration = (statement: string) => {
    try {
      sqlite.prepare(statement).run();
    } catch (error) {
      // Ignore "column already exists" and similar non-critical errors
      if (!error.message.includes('already exists') && 
          !error.message.includes('duplicate column name') && 
          !error.message.includes('no such column')) {
        console.log('Migration warning:', error.message);
      }
    }
  };

  try {
    // Check if tables exist by querying users table
    sqlite.prepare('SELECT COUNT(*) FROM users LIMIT 1').get();
    console.log('Database tables already exist.');
    
    // Run migrations to handle schema changes
    console.log('Checking for schema updates...');
    
    // Add missing columns to existing tables
    runMigration('ALTER TABLE applications ADD COLUMN pause_user_message TEXT DEFAULT "Account Is Paused Temporally. Contract Support"');
    runMigration('ALTER TABLE app_users ADD COLUMN last_login_ip TEXT');
    
    console.log('Schema updates completed.');
  } catch (error) {
    console.log('Database tables not found, initializing...');
    
    const createTables = `
      CREATE TABLE IF NOT EXISTS sessions (
        sid TEXT PRIMARY KEY,
        sess TEXT NOT NULL,
        expire INTEGER NOT NULL
      );

      CREATE INDEX IF NOT EXISTS IDX_session_expire ON sessions(expire);

      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY NOT NULL,
        email TEXT UNIQUE,
        first_name TEXT,
        last_name TEXT,
        profile_image_url TEXT,
        role TEXT NOT NULL DEFAULT 'user',
        permissions TEXT NOT NULL DEFAULT '[]',
        is_active INTEGER NOT NULL DEFAULT 1,
        created_at INTEGER DEFAULT ${Date.now()},
        updated_at INTEGER DEFAULT ${Date.now()}
      );

      CREATE TABLE IF NOT EXISTS applications (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT NOT NULL,
        name TEXT NOT NULL,
        description TEXT,
        api_key TEXT NOT NULL UNIQUE,
        version TEXT NOT NULL DEFAULT '1.0.0',
        is_active INTEGER NOT NULL DEFAULT 1,
        hwid_lock_enabled INTEGER NOT NULL DEFAULT 0,
        login_success_message TEXT DEFAULT 'Login successful!',
        login_failed_message TEXT DEFAULT 'Invalid credentials!',
        account_disabled_message TEXT DEFAULT 'Account is disabled!',
        account_expired_message TEXT DEFAULT 'Account has expired!',
        version_mismatch_message TEXT DEFAULT 'Please update your application to the latest version!',
        hwid_mismatch_message TEXT DEFAULT 'Hardware ID mismatch detected!',
        pause_user_message TEXT DEFAULT 'Account Is Paused Temporally. Contract Support',
        created_at INTEGER NOT NULL DEFAULT ${Date.now()},
        updated_at INTEGER NOT NULL DEFAULT ${Date.now()},
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS license_keys (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        application_id INTEGER NOT NULL,
        license_key TEXT NOT NULL UNIQUE,
        max_users INTEGER NOT NULL DEFAULT 1,
        current_users INTEGER NOT NULL DEFAULT 0,
        validity_days INTEGER NOT NULL,
        expires_at INTEGER NOT NULL,
        is_active INTEGER DEFAULT 1 NOT NULL,
        description TEXT,
        created_at INTEGER NOT NULL DEFAULT ${Date.now()},
        updated_at INTEGER NOT NULL DEFAULT ${Date.now()},
        FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS app_users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        application_id INTEGER NOT NULL,
        license_key_id INTEGER,
        username TEXT NOT NULL,
        password TEXT NOT NULL,
        email TEXT,
        is_active INTEGER NOT NULL DEFAULT 1,
        is_paused INTEGER NOT NULL DEFAULT 0,
        hwid TEXT,
        last_login_ip TEXT,
        expires_at INTEGER,
        created_at INTEGER NOT NULL DEFAULT ${Date.now()},
        last_login INTEGER,
        login_attempts INTEGER NOT NULL DEFAULT 0,
        last_login_attempt INTEGER,
        FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE CASCADE,
        FOREIGN KEY (license_key_id) REFERENCES license_keys(id) ON DELETE SET NULL
      );

      CREATE INDEX IF NOT EXISTS unique_username_per_app ON app_users(application_id, username);
      CREATE INDEX IF NOT EXISTS unique_email_per_app ON app_users(application_id, email);

      CREATE TABLE IF NOT EXISTS webhooks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT NOT NULL,
        url TEXT NOT NULL,
        secret TEXT,
        events TEXT NOT NULL DEFAULT '[]',
        is_active INTEGER NOT NULL DEFAULT 1,
        created_at INTEGER NOT NULL DEFAULT ${Date.now()},
        updated_at INTEGER NOT NULL DEFAULT ${Date.now()},
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS blacklist (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        application_id INTEGER,
        user_id TEXT,
        type TEXT NOT NULL,
        value TEXT NOT NULL,
        reason TEXT,
        is_active INTEGER NOT NULL DEFAULT 1,
        created_at INTEGER NOT NULL DEFAULT ${Date.now()},
        created_by TEXT,
        FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (created_by) REFERENCES users(id)
      );

      CREATE INDEX IF NOT EXISTS unique_blacklist_entry ON blacklist(application_id, type, value);

      CREATE TABLE IF NOT EXISTS activity_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        application_id INTEGER,
        app_user_id INTEGER,
        event TEXT NOT NULL,
        ip_address TEXT,
        hwid TEXT,
        user_agent TEXT,
        metadata TEXT,
        success INTEGER NOT NULL DEFAULT 1,
        error_message TEXT,
        created_at INTEGER NOT NULL DEFAULT ${Date.now()},
        FOREIGN KEY (app_user_id) REFERENCES app_users(id) ON DELETE CASCADE,
        FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS activity_logs_by_app ON activity_logs(application_id, created_at);
      CREATE INDEX IF NOT EXISTS activity_logs_by_user ON activity_logs(app_user_id, created_at);

      CREATE TABLE IF NOT EXISTS active_sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        application_id INTEGER NOT NULL,
        app_user_id INTEGER NOT NULL,
        session_token TEXT NOT NULL UNIQUE,
        ip_address TEXT,
        hwid TEXT,
        user_agent TEXT,
        location TEXT,
        is_active INTEGER NOT NULL DEFAULT 1,
        last_activity INTEGER NOT NULL DEFAULT ${Date.now()},
        created_at INTEGER NOT NULL DEFAULT ${Date.now()},
        expires_at INTEGER,
        FOREIGN KEY (app_user_id) REFERENCES app_users(id) ON DELETE CASCADE,
        FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS active_sessions_by_app ON active_sessions(application_id, is_active);
      CREATE INDEX IF NOT EXISTS active_sessions_by_user ON active_sessions(app_user_id, is_active);
    `;

    const statements = createTables.split(';').filter(stmt => stmt.trim());
    for (const statement of statements) {
      if (statement.trim()) {
        sqlite.exec(statement.trim());
      }
    }
    
    console.log('Database schema initialized successfully!');
  }
};

// Initialize database on startup
initializeDatabase();

export const db = drizzle({ client: sqlite, schema });