import pg from 'pg';
const { Pool } = pg;

// Conexion a la base de datos InnovaOper_Tunning para obtener usuarios de pav_office365
const host = process.env.AZURE_DB_HOST;
const port = process.env.AZURE_DB_PORT || '5432';
const user = process.env.AZURE_DB_USER;
const password = process.env.AZURE_DB_PASSWORD;
const database = process.env.AZURE_DB_NAME_Tunning;

let tunningPool: pg.Pool | null = null;

function getTunningPool(): pg.Pool | null {
  if (!host || !user || !password || !database) {
    console.warn('[TUNNING-DB] Faltan credenciales para la base de datos Tunning');
    return null;
  }

  if (!tunningPool) {
    const connectionString = `postgresql://${encodeURIComponent(user)}:${encodeURIComponent(password)}@${host}:${port}/${database}?sslmode=require`;

    tunningPool = new Pool({
      connectionString,
      ssl: { rejectUnauthorized: false },
      max: 2,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    });

    console.log('[TUNNING-DB] Pool creado para InnovaOper_Tunning');
  }

  return tunningPool;
}

export interface PavOffice365User {
  id: string;
  ficha: string;
  nombre: string;
  appaterno: string;
  apmaterno: string;
  nombre_completo: string;
  email_tunning: string;
  carnom: string;
  desarn: string;
  rut: string;
  enable: string;
  estado_user: string;
}

/**
 * Obtener todos los usuarios activos de pav_office365
 */
export async function getAllPavUsersBasic(): Promise<PavOffice365User[]> {
  const pool = getTunningPool();
  if (!pool) {
    return [];
  }

  try {
    const result = await pool.query<PavOffice365User>(
      `SELECT id, ficha, nombre, appaterno, apmaterno, nombre_completo,
              email_tunning, carnom, desarn, rut, enable, estado_user
       FROM pav_office365
       WHERE enable = '1' AND estado_user = 'Activo'
       ORDER BY nombre_completo`
    );

    return result.rows;
  } catch (error) {
    console.error('[TUNNING-DB] Error al obtener usuarios:', error);
    return [];
  }
}

/**
 * Interface para registros de pav_inn_ordencom
 */
export interface OrdenCompra {
  codaux: string;
  nomaux: string | null;
  numoc: string;
  numinteroc: number | null;
  fechaoc: string | null;
  numlinea: number;
  codprod: string | null;
  desprod: string | null;
  desprod2: string | null;
  fechaent: string | null;
  cantidad: string | null;
  recibido: string | null;
  codicc: string | null;
  equivmonoc: string | null;
  subtotaloc: string | null;
  subtotalmb: string | null;
  valortotoc: string | null;
  valortotmb: string | null;
  estado_registro: string | null;
  fecha_sincronizacion: string | null;
  fecha_creacion: string | null;
  fecha_modificacion: string | null;
  fecultact: string | null;
  tipo: string | null;
}

/**
 * Obtener ordenes de compra con paginacion y filtros
 */
export async function getOrdenesCompra(params: {
  page?: number;
  pageSize?: number;
  search?: string;
  costCenter?: string;
  estado?: string;
  tipoCategoria?: string;
  proveedor?: string;
  fechaOcDesde?: string;
  fechaOcHasta?: string;
  fechaEntDesde?: string;
  fechaEntHasta?: string;
}): Promise<{ rows: OrdenCompra[]; total: number }> {
  const pool = getTunningPool();
  if (!pool) {
    return { rows: [], total: 0 };
  }

  const { page = 1, pageSize = 50, search, costCenter, estado, tipoCategoria, proveedor, fechaOcDesde, fechaOcHasta, fechaEntDesde, fechaEntHasta } = params;
  const offset = (page - 1) * pageSize;

  try {
    const conditions: string[] = [];
    const values: any[] = [];
    let paramIdx = 1;

    if (search) {
      conditions.push(`(numoc ILIKE $${paramIdx} OR nomaux ILIKE $${paramIdx} OR codprod ILIKE $${paramIdx} OR desprod ILIKE $${paramIdx} OR codicc ILIKE $${paramIdx} OR codaux ILIKE $${paramIdx})`);
      values.push(`%${search}%`);
      paramIdx++;
    }

    if (costCenter) {
      conditions.push(`codicc = $${paramIdx}`);
      values.push(costCenter);
      paramIdx++;
    }

    if (estado) {
      conditions.push(`estado_registro = $${paramIdx}`);
      values.push(estado);
      paramIdx++;
    }

    if (tipoCategoria === "suministros") {
      conditions.push(`tipo = '1'`);
    } else if (tipoCategoria === "servicios") {
      conditions.push(`(tipo IS NULL OR tipo <> '1')`);
    }

    if (proveedor) {
      conditions.push(`codaux = $${paramIdx}`);
      values.push(proveedor);
      paramIdx++;
    }

    if (fechaOcDesde) {
      conditions.push(`fechaoc::date >= $${paramIdx}::date`);
      values.push(fechaOcDesde);
      paramIdx++;
    }

    if (fechaOcHasta) {
      conditions.push(`fechaoc::date <= $${paramIdx}::date`);
      values.push(fechaOcHasta);
      paramIdx++;
    }

    if (fechaEntDesde) {
      conditions.push(`fechaent::date >= $${paramIdx}::date`);
      values.push(fechaEntDesde);
      paramIdx++;
    }

    if (fechaEntHasta) {
      conditions.push(`fechaent::date <= $${paramIdx}::date`);
      values.push(fechaEntHasta);
      paramIdx++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countResult = await pool.query(
      `SELECT COUNT(*) as total FROM pav_inn_ordencom ${whereClause}`,
      values
    );
    const total = parseInt(countResult.rows[0].total);

    const dataResult = await pool.query<OrdenCompra>(
      `SELECT codaux, nomaux, numoc, numinteroc, fechaoc, numlinea,
              codprod, desprod, desprod2, fechaent, cantidad, recibido,
              codicc, equivmonoc, subtotaloc, subtotalmb, valortotoc, valortotmb,
              estado_registro, fecha_sincronizacion, fecha_creacion, fecha_modificacion, fecultact, tipo
       FROM pav_inn_ordencom
       ${whereClause}
       ORDER BY fechaoc DESC, numoc, numlinea
       LIMIT $${paramIdx} OFFSET $${paramIdx + 1}`,
      [...values, pageSize, offset]
    );

    return { rows: dataResult.rows, total };
  } catch (error) {
    console.error('[TUNNING-DB] Error al obtener ordenes de compra:', error);
    return { rows: [], total: 0 };
  }
}

/**
 * Obtener centros de costo unicos de ordenes de compra
 */
export async function getOrdenesCompraCostCenters(): Promise<string[]> {
  const pool = getTunningPool();
  if (!pool) return [];

  try {
    const result = await pool.query(
      `SELECT DISTINCT codicc FROM pav_inn_ordencom WHERE codicc IS NOT NULL ORDER BY codicc`
    );
    return result.rows.map((r: any) => r.codicc);
  } catch (error) {
    console.error('[TUNNING-DB] Error al obtener centros de costo:', error);
    return [];
  }
}

/**
 * Buscar OCs por numero (autocomplete)
 */
export async function searchOrdenesCompraNumbers(search: string): Promise<Array<{ numoc: string; nomaux: string | null; fechaoc: string | null; lineCount: number }>> {
  const pool = getTunningPool();
  if (!pool) return [];

  try {
    const result = await pool.query(
      `SELECT numoc, MIN(nomaux) as nomaux, MIN(fechaoc) as fechaoc, COUNT(*)::int as line_count
       FROM pav_inn_ordencom
       WHERE numoc ILIKE $1
       GROUP BY numoc
       ORDER BY MIN(fechaoc) DESC
       LIMIT 20`,
      [`%${search}%`]
    );
    return result.rows.map((r: any) => ({
      numoc: r.numoc,
      nomaux: r.nomaux,
      fechaoc: r.fechaoc,
      lineCount: r.line_count,
    }));
  } catch (error) {
    console.error('[TUNNING-DB] Error al buscar OCs:', error);
    return [];
  }
}

/**
 * Obtener todas las lineas de una OC especifica
 */
export async function getOrdenCompraByNumber(numoc: string): Promise<OrdenCompra[]> {
  const pool = getTunningPool();
  if (!pool) return [];

  try {
    const result = await pool.query<OrdenCompra>(
      `SELECT codaux, nomaux, numoc, numinteroc, fechaoc, numlinea,
              codprod, desprod, desprod2, fechaent, cantidad, recibido,
              codicc, equivmonoc, subtotaloc, subtotalmb, valortotoc, valortotmb,
              estado_registro, fecha_sincronizacion, fecha_creacion, fecha_modificacion, fecultact, tipo
       FROM pav_inn_ordencom
       WHERE numoc = $1
       ORDER BY numlinea`,
      [numoc]
    );
    return result.rows;
  } catch (error) {
    console.error('[TUNNING-DB] Error al obtener OC por numero:', error);
    return [];
  }
}

/**
 * Obtener centros de costo distintos de una OC especifica
 */
export async function getOrdenCompraCostCentersByOC(numoc: string): Promise<string[]> {
  const pool = getTunningPool();
  if (!pool) return [];

  try {
    const result = await pool.query(
      `SELECT DISTINCT codicc FROM pav_inn_ordencom
       WHERE numoc = $1 AND codicc IS NOT NULL
       ORDER BY codicc`,
      [numoc]
    );
    return result.rows.map((r: any) => r.codicc);
  } catch (error) {
    console.error('[TUNNING-DB] Error al obtener CCs de OC:', error);
    return [];
  }
}

/**
 * Obtener lineas de OC filtradas por centro de costo
 */
export async function getOrdenCompraLinesByOCandCC(numoc: string, codicc: string): Promise<OrdenCompra[]> {
  const pool = getTunningPool();
  if (!pool) return [];

  try {
    const result = await pool.query<OrdenCompra>(
      `SELECT codaux, nomaux, numoc, numinteroc, fechaoc, numlinea,
              codprod, desprod, desprod2, fechaent, cantidad, recibido,
              codicc, equivmonoc, subtotaloc, subtotalmb, valortotoc, valortotmb,
              estado_registro, fecha_sincronizacion, fecha_creacion, fecha_modificacion, fecultact, tipo
       FROM pav_inn_ordencom
       WHERE numoc = $1 AND codicc = $2
       ORDER BY numlinea`,
      [numoc, codicc]
    );
    return result.rows;
  } catch (error) {
    console.error('[TUNNING-DB] Error al obtener lineas por OC y CC:', error);
    return [];
  }
}

/**
 * Obtener proveedores unicos de ordenes de compra
 */
export async function getOrdenesCompraProveedores(): Promise<Array<{codaux: string, nomaux: string}>> {
  const pool = getTunningPool();
  if (!pool) return [];

  try {
    const result = await pool.query(
      `SELECT DISTINCT codaux, nomaux FROM pav_inn_ordencom WHERE codaux IS NOT NULL ORDER BY nomaux`
    );
    return result.rows.map((r: any) => ({ codaux: r.codaux, nomaux: r.nomaux || '' }));
  } catch (error) {
    console.error('[TUNNING-DB] Error al obtener proveedores:', error);
    return [];
  }
}

/**
 * Verificar conexion a la base de datos Tunning
 */
export async function testTunningConnection(): Promise<boolean> {
  const pool = getTunningPool();
  if (!pool) {
    return false;
  }

  try {
    await pool.query('SELECT 1');
    return true;
  } catch (error) {
    console.error('[TUNNING-DB] Fallo la prueba de conexion:', error);
    return false;
  }
}
