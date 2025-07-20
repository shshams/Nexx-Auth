import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import * as schema from "@shared/schema";

console.log('Initializing SQLite database...');

// Create or connect to SQLite database
const sqlite = new Database('./database/nexxauth.sqlite');
sqlite.pragma('journal_mode = WAL');

const db = drizzle({ client: sqlite, schema });

// Create tables directly using SQL since we can't run migrations
const createTables = () => {
  // Create sessions table
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS sessions (
      sid TEXT PRIMARY KEY,
      sess TEXT NOT NULL,
      expire INTEGER NOT NULL
    );
  `);

  // Create index on expire
  sqlite.exec(`
    CREATE INDEX IF NOT EXISTS IDX_session_expire ON sessions(expire);
  `);

  // Create users table
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE,
      first_name TEXT,
      last_name TEXT,
      profile_image_url TEXT,
      role TEXT NOT NULL DEFAULT 'user',
      permissions TEXT NOT NULL DEFAULT '[]',
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at INTEGER DEFAULT (strftime('%s', 'now') * 1000),
      updated_at INTEGER DEFAULT (strftime('%s', 'now') * 1000)
    );
  `);

  // Create applications table
  sqlite.exec(`
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
      created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000),
      updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  // Create license_keys table
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS license_keys (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      application_id INTEGER NOT NULL,
      license_key TEXT NOT NULL UNIQUE,
      max_users INTEGER NOT NULL DEFAULT 1,
      current_users INTEGER NOT NULL DEFAULT 0,
      validity_days INTEGER NOT NULL,
      expires_at INTEGER NOT NULL,
      is_active INTEGER NOT NULL DEFAULT 1,
      description TEXT,
      created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000),
      updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000),
      FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE CASCADE
    );
  `);

  // Create app_users table
  sqlite.exec(`
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
      expires_at INTEGER,
      created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000),
      last_login INTEGER,
      login_attempts INTEGER NOT NULL DEFAULT 0,
      last_login_attempt INTEGER,
      FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE CASCADE,
      FOREIGN KEY (license_key_id) REFERENCES license_keys(id) ON DELETE SET NULL
    );
  `);

  // Create indexes for app_users
  sqlite.exec(`
    CREATE INDEX IF NOT EXISTS unique_username_per_app ON app_users(application_id, username);
  `);
  sqlite.exec(`
    CREATE INDEX IF NOT EXISTS unique_email_per_app ON app_users(application_id, email);
  `);

  // Create webhooks table
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS webhooks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      url TEXT NOT NULL,
      secret TEXT,
      events TEXT NOT NULL DEFAULT '[]',
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000),
      updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  // Create blacklist table
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS blacklist (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      application_id INTEGER,
      user_id TEXT,
      type TEXT NOT NULL,
      value TEXT NOT NULL,
      reason TEXT,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000),
      created_by TEXT,
      FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (created_by) REFERENCES users(id)
    );
  `);

  // Create index for blacklist
  sqlite.exec(`
    CREATE INDEX IF NOT EXISTS unique_blacklist_entry ON blacklist(application_id, type, value);
  `);

  // Create activity_logs table
  sqlite.exec(`
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
      created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000),
      FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE CASCADE,
      FOREIGN KEY (app_user_id) REFERENCES app_users(id) ON DELETE CASCADE
    );
  `);

  // Create indexes for activity_logs
  sqlite.exec(`
    CREATE INDEX IF NOT EXISTS activity_logs_by_app ON activity_logs(application_id, created_at);
  `);
  sqlite.exec(`
    CREATE INDEX IF NOT EXISTS activity_logs_by_user ON activity_logs(app_user_id, created_at);
  `);

  // Create active_sessions table
  sqlite.exec(`
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
      last_activity INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000),
      created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000),
      expires_at INTEGER,
      FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE CASCADE,
      FOREIGN KEY (app_user_id) REFERENCES app_users(id) ON DELETE CASCADE
    );
  `);

  // Create indexes for active_sessions
  sqlite.exec(`
    CREATE INDEX IF NOT EXISTS active_sessions_by_app ON active_sessions(application_id, is_active);
  `);
  sqlite.exec(`
    CREATE INDEX IF NOT EXISTS active_sessions_by_user ON active_sessions(app_user_id, is_active);
  `);

  console.log('Database tables created successfully!');
};

try {
  createTables();
  console.log('SQLite database initialized successfully!');
  process.exit(0);
} catch (error) {
  console.error('Error initializing database:', error);
  process.exit(1);
}