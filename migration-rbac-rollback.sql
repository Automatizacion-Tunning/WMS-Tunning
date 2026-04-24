-- Rollback de la migracion del modulo Informes (reports.view + report_generation_log)
-- Ejecutar en orden inverso a migration-rbac.sql + migration-report-audit.sql
-- Idempotente: seguro de re-ejecutar.

-- 1) Quitar el permiso reports.view de los roles
DELETE FROM role_permissions
 WHERE permission_id = (SELECT id FROM permissions WHERE key = 'reports.view');

-- 2) Quitar el permiso reports.view del catalogo
DELETE FROM permissions WHERE key = 'reports.view';

-- 3) Eliminar tabla de auditoria de generacion de informes
DROP INDEX IF EXISTS idx_rgl_cc;
DROP INDEX IF EXISTS idx_rgl_user;
DROP TABLE IF EXISTS report_generation_log;
