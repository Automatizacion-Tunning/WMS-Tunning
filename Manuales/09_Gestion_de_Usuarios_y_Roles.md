# 9. Gestion de Usuarios y Roles

## Descripcion General

El modulo de Gestion de Usuarios y Roles implementa un sistema RBAC (Role-Based Access Control) completo que controla el acceso a todas las funcionalidades del sistema. El modulo consta de:

- **Gestion de usuarios:** CRUD completo, asignacion de roles, generacion masiva desde la base de datos Tunning (tabla `pav_office365`).
- **Gestion de roles:** Creacion, edicion y eliminacion de roles con nivel de jerarquia.
- **Permisos granulares:** 17+ permisos organizados por categoria (Dashboard, Productos, Inventario, Bodegas, Centros de Costo, Ordenes, Administracion), asignables a cada rol.
- **Middleware RBAC:** Sistema de autorizacion con cache en memoria (TTL 5 minutos) que valida permisos en cada endpoint protegido.

El rol `admin` tiene acceso total automatico (permiso wildcard `*`). Los demas roles solo acceden a las funcionalidades que tengan explicitamente asignadas.

## Paginas Frontend

| Archivo | Descripcion |
|---------|-------------|
| `client/src/pages/users/UserManagement.tsx` | Pagina principal de gestion de usuarios. Lista usuarios con filtros por nombre/ficha y por rol. Permite crear, editar, eliminar usuarios y asignar roles directamente desde un selector. Incluye boton "Generar Todos los Usuarios" que importa masivamente desde la base Tunning. |
| `client/src/pages/users/UserList.tsx` | Vista de listado simple de usuarios en formato tabla. Muestra username, rol (con badge), estado (Activo/Inactivo) y fecha de registro. |
| `client/src/pages/users/UserPermissions.tsx` | Vista de matriz de permisos por rol. Muestra tabla cruzada de permisos vs roles (Administrador, Gerente, Usuario) con switches visuales. Incluye descripcion de cada rol. |
| `client/src/pages/admin/RolesManagement.tsx` | Pagina de gestion de roles con layout de 2 paneles. Panel izquierdo: lista de roles ordenados por jerarquia con conteo de usuarios asignados. Panel derecho: editor de permisos del rol seleccionado, organizado por categorias con checkboxes individuales y "seleccionar todos" por categoria. Permite crear y eliminar roles (solo no-sistema sin usuarios). |

## Endpoints API

### Usuarios

| Metodo | Ruta | Permiso | Descripcion |
|--------|------|---------|-------------|
| GET | `/api/users` | requireAuth | Obtener todos los usuarios (sin campo password). |
| GET | `/api/users/:id` | requireAuth | Obtener un usuario por ID. |
| POST | `/api/users` | `users.manage` | Crear nuevo usuario. Valida con `userFormSchema`. |
| PUT | `/api/users/:id` | `users.manage` | Actualizar datos de un usuario. |
| DELETE | `/api/users/:id` | `users.manage` | Desactivar un usuario. |
| GET | `/api/users/role/:role` | requireAuth | Obtener usuarios filtrados por rol. |
| PUT | `/api/users/:id/role` | `users.manage` | Asignar rol a un usuario. Valida con `assignRoleSchema`. |
| PUT | `/api/users/:id/permissions` | `users.manage` | Asignar permisos individuales y bodegas gestionadas a un usuario. |
| GET | `/api/users/:id/permissions/:permission` | requireAuth | Verificar si un usuario tiene un permiso especifico. |
| POST | `/api/users/generate-all` | `users.manage` | Generar usuarios masivamente desde la base Tunning (`pav_office365`). Username: primera letra nombre + apellido + ficha. Contrasena: 4 primeros digitos de la ficha. Rol por defecto: `user`. |

### Roles y Permisos

| Metodo | Ruta | Permiso | Descripcion |
|--------|------|---------|-------------|
| GET | `/api/roles` | requireAuth | Obtener todos los roles. |
| GET | `/api/roles/:id` | requireAuth | Obtener un rol con sus permisos asignados. |
| POST | `/api/roles` | `roles.manage` | Crear nuevo rol. Requiere code, name, hierarchy. |
| PUT | `/api/roles/:id` | `roles.manage` | Actualizar datos de un rol. |
| PUT | `/api/roles/:id/permissions` | `roles.manage` | Actualizar permisos asignados a un rol. Recibe array de `permissionKeys`. |
| DELETE | `/api/roles/:id` | `roles.manage` | Eliminar rol (solo si no es de sistema y no tiene usuarios asignados). |
| GET | `/api/permissions` | requireAuth | Obtener todos los permisos disponibles del sistema. |

## Tablas de Base de Datos

### Tabla `users`

| Campo | Tipo | Descripcion |
|-------|------|-------------|
| id | serial (PK) | Identificador unico |
| username | varchar(50) | Nombre de usuario (unico) |
| password | text | Contrasena hasheada |
| firstName | varchar(100) | Nombre |
| lastName | varchar(100) | Apellido |
| email | varchar(255) | Correo electronico (unico) |
| ficha | varchar(20) | Numero de ficha del trabajador (vinculo con `pav_office365`, unico) |
| role | varchar(30) | Codigo del rol asignado (default: `user`) |
| costCenter | varchar(100) | Centro de costo asignado al usuario |
| permissions | text[] | Array de permisos especificos del usuario |
| managedWarehouses | integer[] | Array de IDs de bodegas que puede gestionar |
| isActive | boolean | Estado activo/inactivo (default: true) |
| createdAt | timestamp | Fecha de creacion |
| updatedAt | timestamp | Fecha de actualizacion |

### Tabla `roles`

| Campo | Tipo | Descripcion |
|-------|------|-------------|
| id | serial (PK) | Identificador unico |
| code | varchar(50) | Codigo unico del rol (ej: `admin`, `project_manager`) |
| name | varchar(100) | Nombre visible del rol |
| description | text | Descripcion del rol |
| isSystem | boolean | Indica si es un rol de sistema (no se puede eliminar) |
| isActive | boolean | Estado activo/inactivo |
| hierarchy | integer | Nivel de jerarquia (menor numero = mayor jerarquia, 0-99). Admin = 100. |
| createdAt | timestamp | Fecha de creacion |
| updatedAt | timestamp | Fecha de actualizacion |

### Tabla `permissions`

| Campo | Tipo | Descripcion |
|-------|------|-------------|
| id | serial (PK) | Identificador unico |
| key | varchar(100) | Clave unica del permiso (ej: `products.create`) |
| name | varchar(200) | Nombre descriptivo |
| module | varchar(50) | Modulo al que pertenece |
| category | varchar(50) | Categoria para agrupacion visual |
| createdAt | timestamp | Fecha de creacion |

### Tabla `role_permissions` (tabla de union)

| Campo | Tipo | Descripcion |
|-------|------|-------------|
| id | serial (PK) | Identificador unico |
| roleId | integer (FK) | ID del rol |
| permissionId | integer (FK) | ID del permiso |

**Restriccion unica:** `(roleId, permissionId)` - Un permiso solo se asigna una vez a cada rol.

## Validaciones

- **userFormSchema:** Validacion de datos de usuario al crear/editar.
- **createRoleSchema:** Validacion al crear un rol (code, name requeridos).
- **updateRoleSchema:** Validacion al actualizar un rol.
- **updateRolePermissionsSchema:** Validacion del array de `permissionKeys`.
- **assignRoleSchema:** Validacion de `roleCode` al asignar rol a usuario.
- **Codigo de rol:** Solo minusculas, numeros y guion bajo (validado en frontend con regex).
- **Eliminacion de roles:** Solo se pueden eliminar roles que no sean de sistema (`isSystem = false`) y que no tengan usuarios asignados.
- **Generacion masiva:** Los usuarios que ya existen (por ficha) son omitidos automaticamente.

## Permisos Requeridos

Los permisos granulares identificados en el sistema son:

| Permiso | Descripcion |
|---------|-------------|
| `products.create` | Crear productos |
| `products.edit` | Editar productos, unidades, categorias, marcas |
| `products.delete` | Eliminar productos, unidades, categorias, marcas |
| `warehouses.create` | Crear bodegas |
| `warehouses.edit` | Editar bodegas |
| `warehouses.delete` | Eliminar bodegas |
| `cost_centers.create` | Crear centros de costo |
| `inventory.movements` | Registrar movimientos de inventario |
| `inventory.entry` | Registrar ingresos de productos y stock |
| `orders.approve_transfers` | Aprobar/rechazar ordenes de traspaso |
| `orders.entry_oc` | Registrar ingresos por orden de compra |
| `users.manage` | Gestionar usuarios (CRUD, asignar roles, generar masivo) |
| `roles.manage` | Gestionar roles (CRUD, asignar permisos) |

Las categorias para agrupacion visual en el frontend son: Dashboard, Productos, Inventario, Bodegas, Centros de Costo, Ordenes, Administracion.

## Flujos de Uso

### Flujo 1: Crear usuario manualmente
1. El administrador accede a "Gestion de Usuarios".
2. Hace clic en "Nuevo Usuario".
3. Completa el formulario (username, contrasena, nombre, apellido, email, ficha, centro de costo).
4. El usuario se crea con rol `user` por defecto.
5. Opcionalmente asigna un rol diferente desde el selector en la lista.

### Flujo 2: Generar usuarios masivamente desde Tunning
1. El administrador hace clic en "Generar Todos los Usuarios".
2. Aparece un dialogo de confirmacion con la configuracion por defecto:
   - Username: primera letra del nombre + apellido + ficha (ej: `jperez_12345`).
   - Contrasena: los 4 primeros digitos de la ficha.
   - Rol: `user` (sin permisos).
3. Se consultan los usuarios activos de `pav_office365` en la base Tunning.
4. Se crean las cuentas que no existan. Las existentes se omiten.
5. Se muestra el resultado: cantidad creados y cantidad omitidos.

### Flujo 3: Gestionar roles y permisos
1. El administrador accede a "Gestion de Roles".
2. En el panel izquierdo ve la lista de roles ordenados por jerarquia, con conteo de usuarios por rol.
3. Al seleccionar un rol, el panel derecho muestra sus permisos agrupados por categoria.
4. Puede marcar/desmarcar permisos individuales o por categoria completa.
5. Al hacer cambios, aparece el boton "Guardar cambios".
6. Los roles de sistema son de solo lectura.
7. Puede crear nuevos roles (code, name, descripcion, jerarquia) o eliminar roles personalizados sin usuarios asignados.

### Flujo 4: Asignar rol a usuario
1. En la lista de usuarios, cada usuario muestra un selector de rol.
2. El administrador cambia el rol directamente desde el selector.
3. El cambio se aplica inmediatamente y se invalida el cache de permisos del usuario.

### Flujo 5: Verificacion de permisos (middleware)
1. Al recibir una peticion a un endpoint protegido, el middleware `requirePermission` verifica la sesion del usuario.
2. Consulta `getUserPermissions` que primero revisa el cache en memoria (TTL 5 min).
3. Si no esta en cache, consulta la base de datos: tabla `users` para obtener el rol, tabla `roles` para la jerarquia, y `role_permissions` + `permissions` para las claves de permiso.
4. Si el usuario es `admin`, se le asigna el permiso wildcard `*` y pasa directamente.
5. Para otros roles, verifica que tenga al menos uno de los permisos requeridos (logica OR con `requirePermission`) o todos (logica AND con `requireAllPermissions`).
6. El resultado se cachea por 5 minutos para evitar consultas repetitivas.
