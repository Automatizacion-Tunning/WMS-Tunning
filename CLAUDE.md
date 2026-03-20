# Proyecto: Control de Inventario (WMS)

## Stack

- Frontend: React 18 + TypeScript + Vite + Tailwind CSS
- Backend: Node.js + Express (server/)
- Base de datos: PostgreSQL (Drizzle ORM, Azure)
- Estructura: client/ + server/ + shared/

## Sistema de Sesiones

Este proyecto usa sesiones para mantener contexto entre conversaciones.

### Lectura obligatoria al iniciar sesion

Al comenzar cualquier conversacion en este proyecto:

1. Listar las carpetas dentro de `sessions/` para mostrar apartados disponibles
2. Preguntar al usuario en que apartado y capa (frontend/backend) va a trabajar
3. Buscar la carpeta con la fecha mas reciente dentro de `sessions/{apartado}/{capa}/`
4. Leer el archivo `notas.md` de esa fecha
5. Usar ese contexto como punto de partida

### Rutas del sistema de sesiones

- Raiz: `./sessions/`
- Formato: `sessions/{apartado}/frontend/{yyyy-MM-dd}/notas.md`
- Formato: `sessions/{apartado}/backend/{yyyy-MM-dd}/notas.md`

### Apartados disponibles

| Apartado | Descripcion |
|----------|-------------|
| auth | Autenticacion, login, sesiones |
| dashboard | Panel principal, metricas, alertas |
| productos | Catalogo, categorias, marcas, unidades, precios, series |
| inventario | Stock, movimientos, entrada de productos, escaneo barcode |
| bodegas | Bodegas jerarquicas, centros de costo, bodega principal |
| traspasos | Ordenes de traspaso entre bodegas |
| ordenes-compra | Recepcion de OC, integracion ERP Tunning |
| usuarios | Gestion de usuarios y permisos individuales |
| roles | Roles RBAC y matriz de permisos |

### Al finalizar una sesion

Crear `sessions/{apartado}/{capa}/{yyyy-MM-dd}/notas.md` con:

```markdown
# Sesion {yyyy-MM-dd}

## Resumen
Breve descripcion de lo trabajado.

## Cambios realizados
- Archivos modificados/creados con descripcion

## Decisiones tomadas
- Razon de cada decision importante

## Pendientes
- [ ] Tareas que quedaron sin completar

## Contexto para proxima sesion
Informacion clave para retomar el trabajo.
```

## Reglas

- No borrar sesiones anteriores, son historial
- Si un apartado no existe, crearlo al momento
- Cada carpeta de fecha puede contener archivos adicionales (snippets, diagramas, etc.)
