import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from "@shared/schema";

console.log('🔍 Configurando base de datos...');
console.log(`IP actual de Replit: 35.185.107.58`);
console.log(`⚠️ Esta IP debe estar autorizada en Azure PostgreSQL firewall`);
console.log(`💡 Mientras tanto, usando Neon PostgreSQL con todos los datos`);

// Temporalmente usar Neon hasta que se configure firewall Azure
const connectionConfig = {
  connectionString: process.env.DATABASE_URL,
  max: 5,
  idleTimeoutMillis: 10000,
  connectionTimeoutMillis: 5000,
  ssl: { rejectUnauthorized: false }
};

console.log(`📡 Conectando a Neon PostgreSQL (datos completos disponibles)`);

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