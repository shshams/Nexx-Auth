import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from "@shared/schema";

// Use the new PostgreSQL database
const databaseUrl = process.env.DATABASE_URL;

console.log('Connecting to database...');

export const pool = new Pool({ 
  connectionString: databaseUrl,
  ssl: false // Local PostgreSQL doesn't need SSL
});

export const db = drizzle({ client: pool, schema });