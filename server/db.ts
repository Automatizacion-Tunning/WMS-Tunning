import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from "@shared/schema";

// Usar Azure PostgreSQL como estaba configurado ayer
if (!process.env.AZURE_DB_HOST || !process.env.AZURE_DB_USER || !process.env.AZURE_DB_PASSWORD || !process.env.AZURE_DB_NAME) {
  throw new Error("Azure PostgreSQL credentials must be set. Did you forget to provision Azure database?");
}

// Construir la URL de conexión para Azure PostgreSQL
const azureConnectionString = `postgresql://${process.env.AZURE_DB_USER}:${encodeURIComponent(process.env.AZURE_DB_PASSWORD)}@${process.env.AZURE_DB_HOST}:${process.env.AZURE_DB_PORT || '5432'}/${process.env.AZURE_DB_NAME}?sslmode=require`;

console.log(`Connecting to Azure PostgreSQL: ${process.env.AZURE_DB_HOST}/${process.env.AZURE_DB_NAME}`);

export const pool = new Pool({ connectionString: azureConnectionString });
export const db = drizzle({ client: pool, schema });