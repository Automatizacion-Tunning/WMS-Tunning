import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from "@shared/schema";

console.log('🔍 Verificando configuración de base de datos Azure...');
console.log(`AZURE_DATABASE_URL disponible: ${process.env.AZURE_DATABASE_URL ? 'Sí' : 'No'}`);

if (!process.env.AZURE_DATABASE_URL) {
  throw new Error("AZURE_DATABASE_URL must be set");
}

// Usar AZURE_DATABASE_URL para conectar a Azure PostgreSQL
const connectionConfig = {
  connectionString: process.env.AZURE_DATABASE_URL,
  max: 5,
  idleTimeoutMillis: 10000,
  connectionTimeoutMillis: 5000,
  ssl: { rejectUnauthorized: false }
};

console.log(`Connecting to Azure PostgreSQL: ${process.env.AZURE_DB_HOST}`);

export const pool = new Pool(connectionConfig);
export const db = drizzle({ client: pool, schema });