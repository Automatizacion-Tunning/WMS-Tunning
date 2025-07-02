import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from "@shared/schema";

// Usar credenciales de Azure PostgreSQL
if (!process.env.AZURE_DB_HOST || !process.env.AZURE_DB_USER || !process.env.AZURE_DB_PASSWORD || !process.env.AZURE_DB_NAME) {
  throw new Error("Azure PostgreSQL credentials must be set");
}

const connectionConfig = {
  host: process.env.AZURE_DB_HOST,
  port: parseInt(process.env.AZURE_DB_PORT || '5432'),
  user: process.env.AZURE_DB_USER,
  password: process.env.AZURE_DB_PASSWORD,
  database: process.env.AZURE_DB_NAME,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 20000,
  ssl: { rejectUnauthorized: false }
};

console.log(`Connecting to Azure PostgreSQL: ${process.env.AZURE_DB_HOST}/${process.env.AZURE_DB_NAME}`);

export const pool = new Pool(connectionConfig);
export const db = drizzle({ client: pool, schema });