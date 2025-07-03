import { Pool } from 'pg';

async function migrateData() {
  // Conexión a Neon (origen)
  const neonPool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  // Conexión a Azure (destino)
  const azurePool = new Pool({
    connectionString: process.env.AZURE_DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('🔄 Iniciando migración de Neon a Azure PostgreSQL...');
    
    // Primero crear las tablas en Azure
    const createTables = `
      -- Users table
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        "firstName" VARCHAR(100),
        "lastName" VARCHAR(100),
        email VARCHAR(255),
        role VARCHAR(50) DEFAULT 'user',
        "costCenter" VARCHAR(100),
        "isActive" BOOLEAN DEFAULT true,
        "createdAt" TIMESTAMP DEFAULT NOW(),
        "updatedAt" TIMESTAMP DEFAULT NOW()
      );

      -- Warehouses table
      CREATE TABLE IF NOT EXISTS warehouses (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        location VARCHAR(255),
        "costCenter" VARCHAR(100),
        type VARCHAR(50) DEFAULT 'SUB_BODEGA',
        "isActive" BOOLEAN DEFAULT true,
        "createdAt" TIMESTAMP DEFAULT NOW(),
        "updatedAt" TIMESTAMP DEFAULT NOW()
      );

      -- Products table
      CREATE TABLE IF NOT EXISTS products (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        sku VARCHAR(100) UNIQUE,
        barcode VARCHAR(100) UNIQUE,
        description TEXT,
        category VARCHAR(100),
        "minStock" INTEGER DEFAULT 0,
        "maxStock" INTEGER DEFAULT 1000,
        "isActive" BOOLEAN DEFAULT true,
        "createdAt" TIMESTAMP DEFAULT NOW(),
        "updatedAt" TIMESTAMP DEFAULT NOW()
      );

      -- Product prices table
      CREATE TABLE IF NOT EXISTS product_prices (
        id SERIAL PRIMARY KEY,
        "productId" INTEGER REFERENCES products(id) ON DELETE CASCADE,
        price NUMERIC(10,2) NOT NULL,
        year INTEGER NOT NULL,
        month INTEGER NOT NULL,
        "isActive" BOOLEAN DEFAULT true,
        "createdAt" TIMESTAMP DEFAULT NOW(),
        UNIQUE("productId", year, month)
      );

      -- Inventory table
      CREATE TABLE IF NOT EXISTS inventory (
        id SERIAL PRIMARY KEY,
        "productId" INTEGER REFERENCES products(id) ON DELETE CASCADE,
        "warehouseId" INTEGER REFERENCES warehouses(id) ON DELETE CASCADE,
        quantity INTEGER DEFAULT 0,
        "updatedAt" TIMESTAMP DEFAULT NOW(),
        UNIQUE("productId", "warehouseId")
      );

      -- Inventory movements table
      CREATE TABLE IF NOT EXISTS inventory_movements (
        id SERIAL PRIMARY KEY,
        "productId" INTEGER REFERENCES products(id) ON DELETE CASCADE,
        "warehouseId" INTEGER REFERENCES warehouses(id) ON DELETE CASCADE,
        "userId" INTEGER REFERENCES users(id),
        type VARCHAR(50) NOT NULL,
        quantity INTEGER NOT NULL,
        "previousQuantity" INTEGER DEFAULT 0,
        "newQuantity" INTEGER DEFAULT 0,
        reference VARCHAR(255),
        notes TEXT,
        "createdAt" TIMESTAMP DEFAULT NOW()
      );

      -- Transfer orders table
      CREATE TABLE IF NOT EXISTS transfer_orders (
        id SERIAL PRIMARY KEY,
        "orderNumber" VARCHAR(50) UNIQUE NOT NULL,
        "productId" INTEGER REFERENCES products(id) ON DELETE CASCADE,
        "sourceWarehouseId" INTEGER REFERENCES warehouses(id),
        "destinationWarehouseId" INTEGER REFERENCES warehouses(id),
        "requesterId" INTEGER REFERENCES users(id),
        "projectManagerId" INTEGER REFERENCES users(id),
        quantity INTEGER NOT NULL,
        status VARCHAR(50) DEFAULT 'PENDING',
        "requestDate" TIMESTAMP DEFAULT NOW(),
        "approvalDate" TIMESTAMP,
        notes TEXT
      );

      -- Product serials table
      CREATE TABLE IF NOT EXISTS product_serials (
        id SERIAL PRIMARY KEY,
        "productId" INTEGER REFERENCES products(id) ON DELETE CASCADE,
        "warehouseId" INTEGER REFERENCES warehouses(id) ON DELETE CASCADE,
        "serialNumber" VARCHAR(255) NOT NULL,
        status VARCHAR(50) DEFAULT 'AVAILABLE',
        "createdAt" TIMESTAMP DEFAULT NOW(),
        "updatedAt" TIMESTAMP DEFAULT NOW(),
        UNIQUE("productId", "serialNumber")
      );
    `;

    await azurePool.query(createTables);
    console.log('✅ Tablas creadas en Azure PostgreSQL');

    // Migrar datos tabla por tabla
    const tables = ['users', 'warehouses', 'products', 'product_prices', 'inventory', 'inventory_movements', 'transfer_orders', 'product_serials'];
    
    for (const table of tables) {
      try {
        console.log(`📦 Migrando tabla: ${table}`);
        
        // Obtener datos de Neon
        const neonResult = await neonPool.query(`SELECT * FROM ${table}`);
        
        if (neonResult.rows.length > 0) {
          // Limpiar tabla en Azure
          await azurePool.query(`TRUNCATE TABLE ${table} RESTART IDENTITY CASCADE`);
          
          // Insertar datos en Azure
          const columns = Object.keys(neonResult.rows[0]);
          const columnNames = columns.map(col => `"${col}"`).join(', ');
          const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');
          
          for (const row of neonResult.rows) {
            const values = columns.map(col => row[col]);
            await azurePool.query(
              `INSERT INTO ${table} (${columnNames}) VALUES (${placeholders})`,
              values
            );
          }
          
          console.log(`✅ ${table}: ${neonResult.rows.length} registros migrados`);
        } else {
          console.log(`⚠️ ${table}: Sin datos para migrar`);
        }
      } catch (error) {
        console.error(`❌ Error migrando ${table}:`, error.message);
      }
    }

    console.log('🎉 Migración completada exitosamente');
    
  } catch (error) {
    console.error('❌ Error en la migración:', error);
  } finally {
    await neonPool.end();
    await azurePool.end();
  }
}

migrateData();