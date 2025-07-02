import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from "@shared/schema";

console.log('🔍 Verificando configuración de base de datos...');
console.log(`DATABASE_URL disponible: ${process.env.DATABASE_URL ? 'Sí' : 'No'}`);

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be set");
}

// Usar DATABASE_URL directamente (funciona con Azure PostgreSQL)
const connectionConfig = {
  connectionString: process.env.DATABASE_URL,
  max: 5,
  idleTimeoutMillis: 10000,
  connectionTimeoutMillis: 5000,
  ssl: { rejectUnauthorized: false }
};

console.log(`Connecting to Azure PostgreSQL via DATABASE_URL`);

export const pool = new Pool(connectionConfig);
export const db = drizzle({ client: pool, schema });