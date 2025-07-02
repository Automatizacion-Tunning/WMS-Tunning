import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from "@shared/schema";

// Usar DATABASE_URL que está funcionando para execute_sql_tool
if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be set");
}

const connectionConfig = {
  connectionString: process.env.DATABASE_URL,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 20000,
  ssl: { rejectUnauthorized: false }
};

console.log('Using DATABASE_URL connection to Azure PostgreSQL');

export const pool = new Pool(connectionConfig);
export const db = drizzle({ client: pool, schema });