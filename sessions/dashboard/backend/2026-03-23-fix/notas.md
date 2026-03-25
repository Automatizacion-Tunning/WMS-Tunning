# Sesion 2026-03-23 (Fix)

## Resumen
Verificacion completa de los 3 endpoints de dashboard y correccion de bug critico en `getAllowedCostCenters`.

## Cambios realizados
- `server/routes.ts` linea 133:
  - **Antes**: `if (user.role !== 'project_manager') return undefined;`
  - **Despues**: `if (user.role === 'admin') return undefined;`
  - Esto corrige que warehouse_operator y viewer veian TODOS los centros de costo como si fueran admin

## Bug encontrado
- **getAllowedCostCenters** usaba logica invertida: solo filtraba PMs, todos los demas roles (operator, viewer) recibian `undefined` (sin filtro = acceso total)
- Impacto: operator y viewer podian ver datos de todos los centros de costo, y no recibian 403 al solicitar CCs ajenos
- Causa raiz: condicion `!== 'project_manager'` en vez de `=== 'admin'`

## Verificaciones realizadas
- Endpoint 401 sin sesion: OK
- Frontend: sin cambios necesarios, codigo correcto
- Logica de filtrado corregida para todos los roles

## Decisiones tomadas
- La condicion ahora es `user.role === 'admin'` para que SOLO admin tenga acceso sin filtro
- PM, operator y viewer todos se filtran por managedWarehouses o costCenter

## Pendientes
- [ ] Probar con usuario operator real para confirmar que ve solo sus CCs
- [ ] Probar con usuario viewer real
- [ ] Probar que PM recibe 403 al pedir CC ajeno

## Contexto para proxima sesion
Bug critico corregido en getAllowedCostCenters. La unica linea cambiada es la condicion de linea 133. Frontend no requirio cambios.
