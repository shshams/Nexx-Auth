import Database from 'better-sqlite3';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Connect to database
const db = new Database(join(__dirname, '../database/primeauth.sqlite'));

try {
  // Check if column exists
  const pragma = db.prepare("PRAGMA table_info(app_users)").all();
  const hasColumn = pragma.some(col => col.name === 'last_login_ip');
  
  if (!hasColumn) {
    console.log('Adding last_login_ip column to app_users table...');
    
    // Add the new column
    db.exec(`
      ALTER TABLE app_users 
      ADD COLUMN last_login_ip TEXT
    `);
    
    console.log('Column added successfully!');
  } else {
    console.log('Column already exists, skipping migration.');
  }
} catch (error) {
  console.error('Migration error:', error);
  process.exit(1);
} finally {
  db.close();
}