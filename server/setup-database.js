import pkg from 'pg';
const { Pool } = pkg;

const databaseUrl = "postgresql://neondb_owner:npg_ZNHf7uDlkF4S@ep-bitter-truth-a8glqli4-pooler.eastus2.azure.neon.tech/neondb?sslmode=require";

const pool = new Pool({
  connectionString: databaseUrl,
  ssl: { rejectUnauthorized: false }
});

const createTables = async () => {
  const client = await pool.connect();
  
  try {
    console.log('Creating database tables...');
    
    // Sessions table for authentication
    await client.query(`
      CREATE TABLE IF NOT EXISTS sessions (
        sid VARCHAR PRIMARY KEY,
        sess JSONB NOT NULL,
        expire TIMESTAMP NOT NULL
      );
    `);
    
    await client.query(`
      CREATE INDEX IF NOT EXISTS "IDX_session_expire" ON sessions (expire);
    `);
    
    // Users table
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR PRIMARY KEY NOT NULL,
        email VARCHAR UNIQUE,
        first_name VARCHAR,
        last_name VARCHAR,
        profile_image_url VARCHAR,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);
    
    // Applications table
    await client.query(`
      CREATE TABLE IF NOT EXISTS applications (
        id SERIAL PRIMARY KEY,
        user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        description TEXT,
        api_key TEXT NOT NULL UNIQUE,
        version TEXT NOT NULL DEFAULT '1.0.0',
        is_active BOOLEAN NOT NULL DEFAULT true,
        hwid_lock_enabled BOOLEAN NOT NULL DEFAULT false,
        login_success_message TEXT DEFAULT 'Login successful!',
        login_failed_message TEXT DEFAULT 'Invalid credentials!',
        account_disabled_message TEXT DEFAULT 'Account is disabled!',
        account_expired_message TEXT DEFAULT 'Account has expired!',
        version_mismatch_message TEXT DEFAULT 'Please update your application to the latest version!',
        hwid_mismatch_message TEXT DEFAULT 'Hardware ID mismatch detected!',
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);
    
    // App users table
    await client.query(`
      CREATE TABLE IF NOT EXISTS app_users (
        id SERIAL PRIMARY KEY,
        application_id INTEGER NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
        username TEXT NOT NULL,
        password TEXT NOT NULL,
        email TEXT,
        is_active BOOLEAN NOT NULL DEFAULT true,
        is_paused BOOLEAN NOT NULL DEFAULT false,
        hwid TEXT,
        expires_at TIMESTAMP,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        last_login TIMESTAMP,
        login_attempts INTEGER NOT NULL DEFAULT 0,
        last_login_attempt TIMESTAMP
      );
    `);
    
    await client.query(`
      CREATE INDEX IF NOT EXISTS "unique_username_per_app" ON app_users (application_id, username);
    `);
    
    await client.query(`
      CREATE INDEX IF NOT EXISTS "unique_email_per_app" ON app_users (application_id, email);
    `);
    
    // Webhooks table
    await client.query(`
      CREATE TABLE IF NOT EXISTS webhooks (
        id SERIAL PRIMARY KEY,
        user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        url TEXT NOT NULL,
        secret TEXT,
        events TEXT[] NOT NULL DEFAULT '{}',
        is_active BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);
    
    // Blacklist table
    await client.query(`
      CREATE TABLE IF NOT EXISTS blacklist (
        id SERIAL PRIMARY KEY,
        application_id INTEGER REFERENCES applications(id) ON DELETE CASCADE,
        user_id VARCHAR REFERENCES users(id) ON DELETE CASCADE,
        type TEXT NOT NULL,
        value TEXT NOT NULL,
        reason TEXT,
        is_active BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        created_by VARCHAR REFERENCES users(id)
      );
    `);
    
    await client.query(`
      CREATE INDEX IF NOT EXISTS "unique_blacklist_entry" ON blacklist (application_id, type, value);
    `);
    
    // Activity logs table
    await client.query(`
      CREATE TABLE IF NOT EXISTS activity_logs (
        id SERIAL PRIMARY KEY,
        application_id INTEGER REFERENCES applications(id) ON DELETE CASCADE,
        app_user_id INTEGER REFERENCES app_users(id) ON DELETE CASCADE,
        event TEXT NOT NULL,
        ip_address TEXT,
        hwid TEXT,
        user_agent TEXT,
        metadata JSONB,
        success BOOLEAN NOT NULL DEFAULT true,
        error_message TEXT,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);
    
    await client.query(`
      CREATE INDEX IF NOT EXISTS "activity_logs_by_app" ON activity_logs (application_id, created_at);
    `);
    
    await client.query(`
      CREATE INDEX IF NOT EXISTS "activity_logs_by_user" ON activity_logs (app_user_id, created_at);
    `);
    
    // Active sessions table
    await client.query(`
      CREATE TABLE IF NOT EXISTS active_sessions (
        id SERIAL PRIMARY KEY,
        application_id INTEGER NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
        app_user_id INTEGER NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
        session_token TEXT NOT NULL UNIQUE,
        ip_address TEXT,
        hwid TEXT,
        user_agent TEXT,
        location TEXT,
        is_active BOOLEAN NOT NULL DEFAULT true,
        last_activity TIMESTAMP NOT NULL DEFAULT NOW(),
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        expires_at TIMESTAMP
      );
    `);
    
    await client.query(`
      CREATE INDEX IF NOT EXISTS "active_sessions_by_app" ON active_sessions (application_id, is_active);
    `);
    
    await client.query(`
      CREATE INDEX IF NOT EXISTS "active_sessions_by_user" ON active_sessions (app_user_id, is_active);
    `);
    
    console.log('All database tables created successfully!');
    
  } catch (error) {
    console.error('Error creating tables:', error);
  } finally {
    client.release();
    await pool.end();
  }
};

createTables();