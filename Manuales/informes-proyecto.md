# Manual: Informes Consolidados por Proyecto

## A quién está dirigido
Jefaturas de proyecto y administradores que necesiten una vista única del estado de un centro de costo (CC) sin tener que revisar módulo por módulo.

## Acceso
- Roles habilitados: **admin** y **project_manager**.
- Permiso técnico: `reports.view`.
- Project Managers ven sólo los CCs asignados a sus bodegas administradas.
- Admins ven todos los CCs.

## Cómo usarlo
1. Inicia sesión con tu usuario.
2. En el sidebar abre la sección **Informes → Por Proyecto**.
3. Selecciona el proyecto (centro de costo) en el `Select`.
4. Pulsa **Refrescar** si necesitas re-generar (los datos se cachean 60 segundos).
5. Navega entre las pestañas:
   - **Resumen:** indicadores agregados (productos, valor, despachados, sólo histórico).
   - **Productos:** tabla con stock, precio, valor, últimos movimientos, series y flags.
   - **Bodegas:** desglose stock por sub-bodega (incluye despacho separado).
   - **OC:** órdenes de compra recibidas en el CC con % de recepción.
   - **Auditoría:** quién y cuándo generó el informe + versión.
6. **Exportar:**
   - Botón **Excel** → descarga `.xlsx` con 4 hojas (Resumen, Productos, Desglose por bodega, OC).
   - Botón **PDF** → descarga `.pdf` apaisado con resumen + tabla simplificada (top-50 si hay más de 100 productos).

## Flags de productos
- **Histórico:** sin stock actual pero con OC o movimientos pasados en el CC. Útil para detectar productos "perdidos".
- **Tránsito:** existen traspasos `pending` o `approved` con destino a una bodega del CC.

## Consistencia de datos
El cálculo de stock y valor reutiliza los mismos métodos que `/cost-centers/:cc`. Si ves diferencias entre el informe y otra vista del sistema, repórtalo a soporte: es una discrepancia y debe investigarse.

## Auditoría
Cada generación queda registrada en la tabla `report_generation_log` con: usuario, CC, formato (json/xlsx/pdf), duración, IP y user agent. Consulta:
```sql
SELECT * FROM report_generation_log
 WHERE cost_center = '1-INFRED'
 ORDER BY created_at DESC LIMIT 20;
```

## Operación

### Variables de entorno
- `FEATURE_REPORTS=true|false` (override). Default: `true` en desarrollo, `false` en producción.

### Rate limit
- 30 requests cada 5 minutos por IP, combinando JSON y export.
- Al exceder se devuelve HTTP 429.

### Caché
- TTL 60 segundos por (costCenter, userId).
- Para forzar regeneración desde el cliente: enviar header `Cache-Control: no-cache`.

### Migración / rollback
- Aplicar permisos y tabla:
  ```bash
  npx tsx --env-file=.env scripts/apply-report-migration.ts
  ```
- Rollback (manual contra Azure):
  ```bash
  psql "$DATABASE_URL" -f migration-rbac-rollback.sql
  ```

### Verificación end-to-end (smoke)
- Dataset + Zod:
  ```bash
  npx tsx --env-file=.env scripts/smoke-report.ts 1-INFRED 1
  ```
- Exportadores XLSX y PDF (genera /tmp/informe-<cc>.{xlsx,pdf}):
  ```bash
  npx tsx --env-file=.env scripts/smoke-export.ts 1-INFRED 1
  ```

## Próximos pasos posibles (V2)
- Filtro temporal (informe a una fecha pasada).
- Comparación entre múltiples CCs.
- Envío programado por correo.
- Almacenamiento histórico en Azure Blob.
- Worker queue (BullMQ + Redis) para CCs con >1000 productos.
