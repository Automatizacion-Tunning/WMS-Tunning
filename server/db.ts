import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from "@shared/schema";

console.log('🔍 Verificando configuración de base de datos Azure...');
console.log(`Azure Host: ${process.env.AZURE_DB_HOST}`);
console.log(`Azure User: ${process.env.AZURE_DB_USER}`);
console.log(`Azure Database: ${process.env.AZURE_DB_NAME}`);

if (!process.env.AZURE_DB_HOST || !process.env.AZURE_DB_USER || !process.env.AZURE_DB_PASSWORD || !process.env.AZURE_DB_NAME) {
  throw new Error("Azure database credentials must be set");
}

// Construir configuración de conexión con credenciales individuales
const connectionConfig = {
  host: process.env.AZURE_DB_HOST,
  user: process.env.AZURE_DB_USER,
  password: process.env.AZURE_DB_PASSWORD,
  database: process.env.AZURE_DB_NAME,
  port: parseInt(process.env.AZURE_DB_PORT || '5432'),
  max: 5,
  idleTimeoutMillis: 10000,
  connectionTimeoutMillis: 5000,
  ssl: { rejectUnauthorized: false }
};

console.log(`Connecting to Azure PostgreSQL: ${process.env.AZURE_DB_HOST}`);

export const pool = new Pool(connectionConfig);
export const db = drizzle({ client: pool, schema });

// Verificar conexión al inicializar
async function testConnection() {
  try {
    const client = await pool.connect();
    const result = await client.query('SELECT current_database(), current_user, version()');
    console.log('✅ Conexión Azure PostgreSQL exitosa:', result.rows[0]);
    client.release();
  } catch (error) {
    console.error('❌ Error conectando a Azure PostgreSQL:', error.message);
  }
}

testConnection();