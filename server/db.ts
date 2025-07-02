import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from "@shared/schema";

// Forzar conexión a Azure PostgreSQL SIEMPRE
if (!process.env.AZURE_DB_HOST || !process.env.AZURE_DB_USER || !process.env.AZURE_DB_PASSWORD || !process.env.AZURE_DB_NAME) {
  throw new Error("Azure PostgreSQL credentials must be set - AZURE connection is MANDATORY");
}

const connectionConfig = {
  host: process.env.AZURE_DB_HOST,
  port: parseInt(process.env.AZURE_DB_PORT || '5432'),
  user: 'administrador_Innovaoper', // Usuario correcto de Azure PostgreSQL
  password: process.env.AZURE_DB_PASSWORD,
  database: process.env.AZURE_DB_NAME,
  ssl: {
    rejectUnauthorized: false,
    require: true
  },
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 60000,
  statement_timeout: 60000,
  query_timeout: 60000,
  keepAlive: true,
  keepAliveInitialDelayMillis: 10000
};

console.log(`FORCING Azure PostgreSQL connection: ${process.env.AZURE_DB_HOST}/${process.env.AZURE_DB_NAME}`);

export const pool = new Pool(connectionConfig);
export const db = drizzle({ client: pool, schema });

// Test de conexión al inicio
pool.on('connect', () => {
  console.log('✅ Successfully connected to Azure PostgreSQL');
});

pool.on('error', (err) => {
  console.error('❌ Azure PostgreSQL connection error:', err);
});