# Sesion 2026-03-18 — QA Funcional (Pruebas contra API real)

## Resumen
Pruebas funcionales reales contra la API en http://localhost:5000 con 8 agentes QA especializados (140 tests), seguido de corrección de 6 bugs y verificación exitosa.

## Pruebas ejecutadas: 140 tests funcionales

| Agente | PASS | FAIL | Total |
|--------|------|------|-------|
| Auth & Sesiones | 12 | 0 | 12 |
| Categorías/Marcas/Unidades | 19 | 4 | 23 |
| Productos CRUD | 18 | 2 | 20 |
| Bodegas CRUD | 9 | 2 | 11 |
| Movimientos Inventario | 15 | 1 | 16 |
| Órdenes de Traspaso | 17 | 1 | 18 |
| Usuarios & RBAC | 18 | 2 | 20 |
| Dashboard & Cross-module | 10 | 10 | 20 |
| **TOTAL** | **118** | **22** | **140** |

## Bugs encontrados y corregidos: 6 fixes

### shared/schema.ts (1 fix)
- FIX-4: `userFormSchema.role` cambiado de `z.string().min(1)` a `z.enum(["admin","project_manager","warehouse_operator","viewer","sin_acceso"])` para rechazar roles inválidos

### server/routes.ts (5 fixes)
- FIX-1: Validación nombre vacío en POST categories/brands/units (`!validatedData.name.trim()` → 400)
- FIX-2: Catch error code 23505 (unique constraint) en POST categories/brands/units → 409
- FIX-3: Catch error code 23505 en POST /api/users → 409 "El nombre de usuario ya existe"
- FIX-5: Catch `error.message.includes('Stock insuficiente')` en POST /api/inventory-movements → 400
- FIX-6: Validación `sourceWarehouseId === destinationWarehouseId` en POST /api/transfer-orders → 400

## Verificación post-fix: 8/8 PASS

| Fix | Resultado |
|-----|-----------|
| Categoría nombre vacío | 400 ✓ |
| Marca nombre vacío | 400 ✓ |
| Unidad nombre vacío | 400 ✓ |
| Categoría duplicada | 409 ✓ |
| Username duplicado | 409 ✓ |
| Rol inválido | 400 ✓ |
| Stock underflow | 400 ✓ |
| Mismo origen/destino traspaso | 400 ✓ |

## Issues no corregidos (fuera de scope o diseño intencional)

### Endpoints faltantes (features, no bugs):
- GET /api/products/:id/prices (historial de precios)
- GET /api/cost-centers (listar centros de costo)
- GET /api/products/:id/serials (listar seriales de producto)

### Diferencias de diseño (no son bugs):
- DELETE devuelve 204 (correcto RESTful, no 200)
- Barcode lookup devuelve 404 cuando no existe (usado por flujo de escaneo frontend)
- Rutas usan nombres diferentes a lo esperado: /api/dashboard/metrics, /api/ordenes-compra, /api/inventory
- Roles usan campo "hierarchy" en vez de "level"

### Pre-existentes (de sesión QA anterior):
- EditProductForm.tsx errores TS pre-existentes
- Sin foreign keys .references() en schema Drizzle
- Sin indexes definidos
- Sin CSRF protection middleware
- Sin ProtectedRoute en frontend
- useAuth usa useState aislado

## Contexto para próxima sesión
Se completaron 140 pruebas funcionales reales contra la API y se corrigieron 6 bugs de validación. El sistema ahora tiene validaciones robustas para nombres vacíos, duplicados, roles inválidos, stock insuficiente y traspasos al mismo destino. Los endpoints faltantes (precios, seriales, centros de costo) son features pendientes de implementar.
