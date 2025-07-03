import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from "@shared/schema";

console.log('🔍 Configurando Azure PostgreSQL...');
console.log(`Azure Host: ${process.env.AZURE_DB_HOST}`);
console.log(`🎯 Datos migrados y listos en Azure PostgreSQL`);

// Usar Azure PostgreSQL con datos completos migrados
const connectionConfig = {
  host: process.env.AZURE_DB_HOST,
  user: process.env.AZURE_DB_USER,
  password: process.env.AZURE_DB_PASSWORD,
  database: process.env.AZURE_DB_NAME,
  port: parseInt(process.env.AZURE_DB_PORT || '5432'),
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
  ssl: { rejectUnauthorized: false }
};

console.log(`🔗 Conectando a Azure PostgreSQL: ${process.env.AZURE_DB_HOST}`);

export const pool = new Pool(connectionConfig);
export const db = drizzle({ client: pool, schema });

// Verificar conexión al inicializar con reintentos
async function testConnection(retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      console.log(`🔄 Intento de conexión ${i + 1}/${retries}...`);
      const client = await pool.connect();
      const result = await client.query('SELECT current_database(), current_user, version()');
      console.log('✅ Azure PostgreSQL conectado exitosamente:', result.rows[0]);
      client.release();
      return;
    } catch (error) {
      console.error(`❌ Intento ${i + 1} falló:`, error.message);
      if (i < retries - 1) {
        console.log('🔄 Reintentando en 2 segundos...');
        await new Promise(resolve => setTimeout(resolve, 2000));
      } else {
        console.error('💥 Todos los intentos de conexión fallaron.');
      }
    }
  }
}

testConnection();