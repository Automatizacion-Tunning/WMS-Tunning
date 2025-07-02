const { Pool } = require('pg');

// Configuración de base de datos actual (Neon/local)
const currentDB = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('neon') ? { rejectUnauthorized: false } : undefined
});

// Configuración de Azure PostgreSQL
const azureDB = new Pool({
  host: process.env.AZURE_DB_HOST,
  port: parseInt(process.env.AZURE_DB_PORT || '5432'),
  database: process.env.AZURE_DB_NAME,
  user: process.env.AZURE_DB_USER,
  password: process.env.AZURE_DB_PASSWORD,
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 30000,
});

async function exportData() {
  console.log('🔄 Exportando datos de la base actual...');
  
  const queries = [
    'SELECT * FROM users ORDER BY id',
    'SELECT * FROM warehouses ORDER BY id', 
    'SELECT * FROM products ORDER BY id',
    'SELECT * FROM product_prices ORDER BY id',
    'SELECT * FROM product_serials ORDER BY id',
    'SELECT * FROM inventory ORDER BY id',
    'SELECT * FROM inventory_movements ORDER BY id',
    'SELECT * FROM transfer_orders ORDER BY id'
  ];
  
  const data = {};
  
  for (const query of queries) {
    try {
      const tableName = query.split(' FROM ')[1].split(' ')[0];
      const result = await currentDB.query(query);
      data[tableName] = result.rows;
      console.log(`✅ ${tableName}: ${result.rows.length} registros`);
    } catch (error) {
      console.log(`⚠️ Error en ${query}: ${error.message}`);
      data[query.split(' FROM ')[1].split(' ')[0]] = [];
    }
  }
  
  return data;
}

async function createTables() {
  console.log('🔨 Creando tablas en Azure PostgreSQL...');
  
  const createTableQueries = [
    `CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      username VARCHAR(50) NOT NULL UNIQUE,
      password_hash VARCHAR(255) NOT NULL,
      role VARCHAR(20) NOT NULL DEFAULT 'user',
      is_active BOOLEAN NOT NULL DEFAULT true,
      created_at TIMESTAMP DEFAULT NOW() NOT NULL
    )`,
    
    `CREATE TABLE IF NOT EXISTS warehouses (
      id SERIAL PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      location TEXT,
      cost_center VARCHAR(100) NOT NULL,
      parent_warehouse_id INTEGER,
      warehouse_type VARCHAR(50) NOT NULL DEFAULT 'sub',
      sub_warehouse_type VARCHAR(50),
      is_active BOOLEAN NOT NULL DEFAULT true,
      created_at TIMESTAMP DEFAULT NOW() NOT NULL,
      FOREIGN KEY (parent_warehouse_id) REFERENCES warehouses(id)
    )`,
    
    `CREATE TABLE IF NOT EXISTS products (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      sku VARCHAR(50) NOT NULL UNIQUE,
      barcode VARCHAR(100) UNIQUE,
      description TEXT,
      min_stock INTEGER NOT NULL DEFAULT 0,
      product_type VARCHAR(20) NOT NULL DEFAULT 'tangible',
      requires_serial BOOLEAN NOT NULL DEFAULT false,
      is_active BOOLEAN NOT NULL DEFAULT true,
      created_at TIMESTAMP DEFAULT NOW() NOT NULL
    )`,
    
    `CREATE TABLE IF NOT EXISTS product_prices (
      id SERIAL PRIMARY KEY,
      product_id INTEGER NOT NULL,
      year INTEGER NOT NULL,
      month INTEGER NOT NULL,
      price DECIMAL(10, 2) NOT NULL,
      created_at TIMESTAMP DEFAULT NOW() NOT NULL,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
      UNIQUE(product_id, year, month)
    )`,
    
    `CREATE TABLE IF NOT EXISTS product_serials (
      id SERIAL PRIMARY KEY,
      product_id INTEGER NOT NULL,
      warehouse_id INTEGER NOT NULL,
      serial_number VARCHAR(100) NOT NULL,
      status VARCHAR(20) NOT NULL DEFAULT 'available',
      created_at TIMESTAMP DEFAULT NOW() NOT NULL,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
      FOREIGN KEY (warehouse_id) REFERENCES warehouses(id) ON DELETE CASCADE,
      UNIQUE(product_id, serial_number)
    )`,
    
    `CREATE TABLE IF NOT EXISTS inventory (
      id SERIAL PRIMARY KEY,
      product_id INTEGER NOT NULL,
      warehouse_id INTEGER NOT NULL,
      quantity INTEGER NOT NULL DEFAULT 0,
      updated_at TIMESTAMP DEFAULT NOW() NOT NULL,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
      FOREIGN KEY (warehouse_id) REFERENCES warehouses(id) ON DELETE CASCADE,
      UNIQUE(product_id, warehouse_id)
    )`,
    
    `CREATE TABLE IF NOT EXISTS inventory_movements (
      id SERIAL PRIMARY KEY,
      product_id INTEGER NOT NULL,
      warehouse_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      movement_type VARCHAR(20) NOT NULL,
      quantity INTEGER NOT NULL,
      price_per_unit DECIMAL(10, 2),
      serial_numbers TEXT[],
      reason TEXT,
      created_at TIMESTAMP DEFAULT NOW() NOT NULL,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
      FOREIGN KEY (warehouse_id) REFERENCES warehouses(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )`,
    
    `CREATE TABLE IF NOT EXISTS transfer_orders (
      id SERIAL PRIMARY KEY,
      order_number VARCHAR(50) NOT NULL UNIQUE,
      product_id INTEGER NOT NULL,
      source_warehouse_id INTEGER NOT NULL,
      destination_warehouse_id INTEGER NOT NULL,
      requester_id INTEGER NOT NULL,
      project_manager_id INTEGER,
      quantity INTEGER NOT NULL,
      status VARCHAR(20) NOT NULL DEFAULT 'pending',
      reason TEXT,
      created_at TIMESTAMP DEFAULT NOW() NOT NULL,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
      FOREIGN KEY (source_warehouse_id) REFERENCES warehouses(id) ON DELETE CASCADE,
      FOREIGN KEY (destination_warehouse_id) REFERENCES warehouses(id) ON DELETE CASCADE,
      FOREIGN KEY (requester_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (project_manager_id) REFERENCES users(id) ON DELETE CASCADE
    )`
  ];
  
  for (const query of createTableQueries) {
    try {
      await azureDB.query(query);
      console.log('✅ Tabla creada correctamente');
    } catch (error) {
      console.log(`⚠️ Error creando tabla: ${error.message}`);
    }
  }
}

async function importData(data) {
  console.log('📥 Importando datos a Azure PostgreSQL...');
  
  const tableOrder = ['users', 'warehouses', 'products', 'product_prices', 'product_serials', 'inventory', 'inventory_movements', 'transfer_orders'];
  
  for (const tableName of tableOrder) {
    const rows = data[tableName] || [];
    if (rows.length === 0) {
      console.log(`⏭️ ${tableName}: Sin datos para importar`);
      continue;
    }
    
    console.log(`📝 Importando ${rows.length} registros a ${tableName}...`);
    
    for (const row of rows) {
      try {
        const columns = Object.keys(row);
        const values = columns.map(col => row[col]);
        const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');
        
        const insertQuery = `
          INSERT INTO ${tableName} (${columns.join(', ')}) 
          VALUES (${placeholders})
          ON CONFLICT DO NOTHING
        `;
        
        await azureDB.query(insertQuery, values);
      } catch (error) {
        console.log(`⚠️ Error insertando en ${tableName}: ${error.message}`);
      }
    }
    
    console.log(`✅ ${tableName}: Importación completada`);
  }
}

async function migrate() {
  try {
    console.log('🚀 Iniciando migración a Azure PostgreSQL...\n');
    
    // Probar conexión a Azure
    console.log('🔌 Probando conexión a Azure...');
    await azureDB.query('SELECT version()');
    console.log('✅ Conexión a Azure exitosa\n');
    
    // Probar conexión actual
    console.log('🔌 Probando conexión a base actual...');
    await currentDB.query('SELECT version()');
    console.log('✅ Conexión a base actual exitosa\n');
    
    // Exportar datos
    const data = await exportData();
    console.log('');
    
    // Crear tablas en Azure
    await createTables();
    console.log('');
    
    // Importar datos
    await importData(data);
    console.log('');
    
    console.log('🎉 ¡Migración completada exitosamente!');
    
  } catch (error) {
    console.error('❌ Error en la migración:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await currentDB.end();
    await azureDB.end();
  }
}

// Ejecutar migración
migrate();