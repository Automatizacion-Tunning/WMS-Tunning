# Sesion 2026-03-18

## Resumen
Plan de pruebas integral ejecutado. Se revisó auth/login con 10 pruebas.

## Hallazgos principales
- **BUG AUTH-09**: `res.clearCookie('connect.sid')` en logout pero cookie real es `wms.sid` — la sesión NO se destruye del lado del cliente
- **FAIL AUTH-01**: No se usa Passport.js, auth es custom con express-session directo
- **WARN SEC-08**: SHA256 sin salt, vulnerable a rainbow tables
- Rate limiting login (10/15min) correcto
- Sesión 24h TTL correcta
- Migración automática de passwords plaintext funciona

## Resultados
- PASS: 5 | WARN: 1 | FAIL: 4

## Pendientes
- [ ] **URGENTE**: Corregir `clearCookie('connect.sid')` → `clearCookie('wms.sid')` en routes.ts linea 82
- [ ] Evaluar migración a bcrypt/scrypt con salt

## Contexto para proxima sesion
El bug de logout es crítico — los usuarios no cierran sesión correctamente. Prioridad alta.
