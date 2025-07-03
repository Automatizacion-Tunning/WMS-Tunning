import { Pool } from 'pg';
import fs from 'fs';

async function setupAzure() {
  const azurePool = new Pool({
    host: process.env.AZURE_DB_HOST,
    user: process.env.AZURE_DB_USER,
    password: process.env.AZURE_DB_PASSWORD,
    database: process.env.AZURE_DB_NAME,
    port: parseInt(process.env.AZURE_DB_PORT || '5432'),
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('🔄 Configurando Azure PostgreSQL...');
    console.log(`📍 Conectando a: ${process.env.AZURE_DB_HOST}`);
    
    // Verificar conexión
    const result = await azurePool.query('SELECT current_database(), version(), current_user;');
    console.log('✅ Conectado a Azure PostgreSQL:', result.rows[0]);
    
    // Leer y ejecutar script SQL
    const sqlScript = fs.readFileSync('azure-setup.sql', 'utf8');
    await azurePool.query(sqlScript);
    
    console.log('🎉 Azure PostgreSQL configurado exitosamente');
    
  } catch (error) {
    console.error('❌ Error configurando Azure:', error.message);
  } finally {
    await azurePool.end();
  }
}

setupAzure();