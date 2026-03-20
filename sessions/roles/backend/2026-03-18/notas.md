# Sesion 2026-03-18

## Resumen
Plan de pruebas integral ejecutado. Se revisó RBAC completo con 20+ pruebas.

## Hallazgos principales
- **BUG RBAC-08**: `validatedData.permissions` en routes.ts:1433 pero schema define `permissionKeys` — al actualizar permisos de rol se BORRAN TODOS
- **WARN RB-13**: `managedWarehouses` no se valida en ningún endpoint server-side
- **WARN PERM-05**: Rol `sin_acceso` accede a todos los endpoints GET (solo usan requireAuth)
- **WARN PERM-02/03**: No hay filtrado server-side por CC ni bodegas asignadas
- Cache 5min funciona correctamente
- requirePermission y requireAdmin funcionan correctamente
- 5 roles y 17 permisos definidos correctamente

## Resultados
- PASS: 12 | WARN: 7 | FAIL: 1

## Pendientes
- [ ] **URGENTE**: Corregir `validatedData.permissions` → `validatedData.permissionKeys` en routes.ts:1433
- [ ] Implementar filtrado server-side por managedWarehouses
- [ ] Agregar requirePermission a endpoints GET sensibles
- [ ] Evaluar bloqueo total para rol sin_acceso

## Contexto para proxima sesion
El bug de updateRolePermissions es crítico — borra permisos de roles al intentar actualizarlos. El sistema RBAC base funciona pero falta enforcement server-side de contexto (CC, bodegas).
