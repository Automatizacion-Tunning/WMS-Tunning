import pg from 'pg';

const pool = new pg.Pool({
  host: process.env.AZURE_DB_HOST,
  user: process.env.AZURE_DB_USER,
  password: process.env.AZURE_DB_PASSWORD,
  database: process.env.AZURE_DB_NAME,
  port: parseInt(process.env.AZURE_DB_PORT || '5432'),
  ssl: { rejectUnauthorized: false },
});

try {
  await pool.query(`
    ALTER TABLE inventory_movements
    ADD COLUMN IF NOT EXISTS serial_number varchar(100);
  `);
  console.log('✅ Columna serial_number agregada exitosamente');
} catch (e) {
  console.error('❌ Error:', e.message);
} finally {
  await pool.end();
}
