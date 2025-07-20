import Database from 'better-sqlite3';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Connect to database
const db = new Database(join(__dirname, '../database/nexxauth.sqlite'));

try {
  // Check if column exists
  const pragma = db.prepare("PRAGMA table_info(applications)").all();
  const hasColumn = pragma.some(col => col.name === 'pause_user_message');
  
  if (!hasColumn) {
    console.log('Adding pause_user_message column to applications table...');
    
    // Add the new column
    db.exec(`
      ALTER TABLE applications 
      ADD COLUMN pause_user_message TEXT DEFAULT 'Account Is Paused Temporally. Contract Support'
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