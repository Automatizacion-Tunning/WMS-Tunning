import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from "@shared/schema";

// Azure PostgreSQL configuration
const useAzure = process.env.AZURE_DB_HOST && process.env.AZURE_DB_USER && process.env.AZURE_DB_PASSWORD && process.env.AZURE_DB_NAME;

console.log('🔍 Verificando configuración de base de datos...');
console.log(`Azure habilitado: ${useAzure ? 'Sí' : 'No'}`);
console.log(`DATABASE_URL disponible: ${process.env.DATABASE_URL ? 'Sí' : 'No'}`);

let connectionConfig;

if (useAzure) {
  // Azure PostgreSQL connection
  connectionConfig = {
    host: process.env.AZURE_DB_HOST,
    port: parseInt(process.env.AZURE_DB_PORT || '5432'),
    database: process.env.AZURE_DB_NAME,
    user: 'administrador_Innovaoper', // Usuario correcto y fijo para Azure PostgreSQL
    password: process.env.AZURE_DB_PASSWORD,
    ssl: {
      rejectUnauthorized: false
    },
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 20000,
  };
  console.log(`Connecting to Azure PostgreSQL: ${process.env.AZURE_DB_HOST}/${process.env.AZURE_DB_NAME}`);
} else {
  // Fallback to existing DATABASE_URL
  if (!process.env.DATABASE_URL) {
    throw new Error("Either Azure credentials or DATABASE_URL must be set");
  }
  connectionConfig = {
    connectionString: process.env.DATABASE_URL,
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
    ssl: process.env.DATABASE_URL.includes('neon') ? { rejectUnauthorized: false } : undefined
  };
  console.log('Using existing DATABASE_URL connection');
}

export const pool = new Pool(connectionConfig);
export const db = drizzle({ client: pool, schema });