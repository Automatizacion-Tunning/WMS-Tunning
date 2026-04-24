-- Migracion: Informes consolidados por centro de costo
-- Crea: permiso reports.view + tabla de auditoria report_generation_log
-- Idempotente con ON CONFLICT / IF NOT EXISTS.
-- Rollback: ver migration-rbac-rollback.sql

-- ===========================================================
-- 1) Permiso reports.view
-- ===========================================================
INSERT INTO permissions (key, name, module, category) VALUES
  ('reports.view', 'Ver Informes Consolidados', 'reports', 'Informes')
ON CONFLICT (key) DO NOTHING;

-- ===========================================================
-- 2) Asignacion del permiso a los roles que decidio el usuario
--    (admin y project_manager — jefaturas)
-- ===========================================================
INSERT INTO role_permissions (role_id, permission_id)
  SELECT r.id, p.id
    FROM roles r CROSS JOIN permissions p
   WHERE r.code IN ('admin','project_manager')
     AND p.key = 'reports.view'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- ===========================================================
-- 3) Tabla de auditoria de generacion de informes
--    Registra una fila por cada llamada exitosa a /api/informes/*
-- ===========================================================
CREATE TABLE IF NOT EXISTS report_generation_log (
  id              SERIAL PRIMARY KEY,
  user_id         INTEGER     NOT NULL,
  cost_center     VARCHAR(50) NOT NULL,
  format          VARCHAR(10) NOT NULL DEFAULT 'json',  -- json | xlsx | pdf
  duration_ms     INTEGER,
  products_count  INTEGER,
  report_version  VARCHAR(20),
  ip              VARCHAR(45),
  user_agent      TEXT,
  created_at      TIMESTAMP   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rgl_cc   ON report_generation_log(cost_center, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_rgl_user ON report_generation_log(user_id,    created_at DESC);
