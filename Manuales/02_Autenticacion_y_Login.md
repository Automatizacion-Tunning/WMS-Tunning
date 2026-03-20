# 2. Autenticacion y Login

## Descripcion General

El modulo de autenticacion gestiona el acceso de usuarios al sistema WMS. Implementa un flujo de login basado en sesiones del lado del servidor con cookies HTTP-only. Las contrasenas se almacenan hasheadas con SHA256 e incluye migracion automatica de contrasenas en texto plano. El sistema cuenta con rate limiting especifico para prevenir ataques de fuerza bruta y comparacion de hashes en tiempo constante para mitigar timing attacks.

## Paginas Frontend

| Ruta | Componente | Archivo | Descripcion |
|------|-----------|---------|-------------|
| (raiz cuando no autenticado) | Login | `client/src/pages/auth/Login.tsx` | Formulario de inicio de sesion |

La pagina de Login se muestra automaticamente cuando el usuario no esta autenticado. No tiene una ruta dedicada; el componente `Router` en `App.tsx` evalua `isAuthenticated` y renderiza Login o el layout principal segun corresponda.

### Elementos del formulario de Login
- Campo **Nombre de Usuario** (obligatorio)
- Campo **Contrasena** (obligatorio, con boton para mostrar/ocultar)
- Boton **Iniciar Sesion** (deshabilitado durante la peticion)
- Alerta de error en caso de credenciales invalidas

### Validacion del formulario (Zod)

```typescript
const loginSchema = z.object({
  username: z.string().min(1, "El nombre de usuario es requerido"),
  password: z.string().min(1, "La contrasena es requerida"),
});
```

## Endpoints API

| Metodo | Ruta | Permiso | Descripcion |
|--------|------|---------|-------------|
| POST | `/api/auth/login` | Publico | Autenticar usuario con username y password |
| POST | `/api/auth/logout` | Publico | Cerrar sesion y destruir cookie |
| GET | `/api/auth/me` | requireAuth | Obtener datos del usuario autenticado |
| GET | `/api/auth/permissions` | requireAuth | Obtener permisos del usuario autenticado |

### Detalle de cada endpoint

**POST /api/auth/login**
- Recibe: `{ username: string, password: string }`
- Valida que ambos campos esten presentes (400 si faltan)
- Busca usuario por username; si no existe o esta inactivo, responde 401
- Si la contrasena almacenada esta en texto plano, la compara directamente y la migra automaticamente a hash SHA256
- Si la contrasena ya esta hasheada, usa comparacion en tiempo constante
- Crea sesion con `req.session.userId` y `req.session.user`
- Responde: `{ message: "Login successful", user: { ...sinPassword } }`

**POST /api/auth/logout**
- Destruye la sesion del servidor con `req.session.destroy()`
- Limpia la cookie `connect.sid`
- Responde: `{ message: "Logout successful" }`

**GET /api/auth/me**
- Requiere sesion activa
- Busca el usuario por `req.session.userId`
- Si el usuario no existe o esta inactivo, responde 401
- Responde con los datos del usuario (sin el campo password)

**GET /api/auth/permissions**
- Requiere sesion activa
- Obtiene los permisos del usuario mediante `getUserPermissions()`
- Responde con el contexto de autorizacion del usuario

## Tablas de Base de Datos

### users (campos relevantes para autenticacion)

| Campo | Tipo | Descripcion |
|-------|------|-------------|
| id | serial PK | Identificador unico |
| username | varchar(50) | Nombre de usuario (unico, usado para login) |
| password | text | Hash SHA256 (64 caracteres hex) o texto plano (legacy) |
| isActive | boolean | Solo usuarios activos pueden iniciar sesion |
| role | varchar(30) | Rol del usuario (admin, project_manager, warehouse_operator, user) |
| permissions | text[] | Permisos especificos asignados |

## Hashing de Contrasenas (server/auth.ts)

El sistema usa **SHA256** para el hashing de contrasenas, implementado con el modulo nativo `crypto` de Node.js.

### Funciones disponibles

**`hashPassword(password: string): Promise<string>`**
- Genera el hash SHA256 en formato hexadecimal (64 caracteres)

**`comparePassword(inputPassword: string, storedPassword: string): Promise<boolean>`**
- Hashea la contrasena ingresada y la compara con la almacenada
- Usa **comparacion en tiempo constante** (XOR byte a byte) para prevenir timing attacks
- Primero verifica que las longitudes coincidan antes de comparar

**`isPlaintextPassword(password: string): boolean`**
- Detecta si un password esta en texto plano
- Un hash SHA256 valido es exactamente 64 caracteres hexadecimales (`/^[a-f0-9]{64}$/`)
- Cualquier string que no cumpla el patron se considera texto plano

### Migracion automatica de contrasenas

Cuando un usuario con contrasena en texto plano inicia sesion exitosamente, el sistema automaticamente:
1. Verifica que la contrasena ingresada coincida con la almacenada en texto plano
2. Genera el hash SHA256 de la contrasena
3. Actualiza el registro del usuario con la version hasheada
4. Los siguientes logins usaran la version hasheada

## Validaciones

### Validaciones del servidor
- Username y password son obligatorios (respuesta 400 si faltan)
- Usuario debe existir y estar activo (`isActive: true`)
- Contrasena debe coincidir (hash o texto plano)
- Sesion debe existir para rutas protegidas (middleware `requireAuth`)

### Validaciones del cliente
- Esquema Zod: username y password con `min(1)` (no pueden estar vacios)
- React Hook Form con `zodResolver` para validacion en tiempo real

## Gestion de Sesiones

### Configuracion del servidor

| Parametro | Valor |
|-----------|-------|
| Store | Memoria (por defecto de express-session) |
| Secret | `SESSION_SECRET` (variable de entorno, obligatorio en produccion) |
| Nombre de cookie | `wms.sid` |
| httpOnly | `true` |
| secure | `true` en produccion |
| sameSite | `lax` |
| maxAge | 24 horas (86.400.000 ms) |
| resave | `false` |
| saveUninitialized | `false` |

### Gestion en el cliente (useAuth hook)

El hook `useAuth` (`client/src/hooks/useAuth.ts`) centraliza el estado de autenticacion:

**Estado:**
- `currentUser` - Datos del usuario autenticado o `null`
- `isAuthenticated` - Booleano de estado de autenticacion
- `isLoading` - Indicador de carga durante verificacion inicial
- `error` - Mensaje de error si la verificacion falla

**Flujo de inicializacion:**
1. Al montar el componente, verifica si existe `currentUser` en `localStorage`
2. Si existe, llama a `GET /api/auth/me` para validar la sesion del servidor
3. Si la sesion es valida, actualiza los datos del usuario en localStorage
4. Si responde 401, limpia localStorage y marca como no autenticado
5. Establece `isLoading = false` al terminar

**Funciones:**
- `login(user)` - Almacena usuario en estado y localStorage
- `logout()` - Llama a `POST /api/auth/logout`, limpia estado y localStorage, recarga la pagina

## Rate Limiting

| Ruta | Limite | Ventana | Mensaje |
|------|--------|---------|---------|
| `/api/*` (global) | 500 peticiones | 15 minutos | "Too many requests, please try again later" |
| `/api/auth/login` | 10 intentos | 15 minutos | "Too many login attempts, please try again after 15 minutes" |

El rate limiting de login se aplica **ademas** del rate limiting global, ofreciendo una capa adicional de proteccion contra ataques de fuerza bruta.

## Permisos Requeridos

| Accion | Permiso |
|--------|---------|
| Iniciar sesion | Ninguno (ruta publica), pero el usuario debe estar activo |
| Cerrar sesion | Ninguno (ruta publica) |
| Consultar datos propios | Sesion activa (requireAuth) |
| Consultar permisos | Sesion activa (requireAuth) |

## Flujos de Uso

### Flujo de Login

1. El usuario accede a la aplicacion
2. El hook `useAuth` verifica si hay datos en localStorage
3. Si hay datos, valida la sesion llamando a `/api/auth/me`
4. Si no hay sesion valida, muestra el formulario de Login
5. El usuario ingresa nombre de usuario y contrasena
6. El formulario valida los campos con Zod (no vacios)
7. Se envia POST a `/api/auth/login` con las credenciales
8. El servidor valida credenciales y crea la sesion
9. El cliente almacena los datos del usuario en localStorage
10. Se muestra un toast de "Inicio de sesion exitoso"
11. La pagina se recarga para cargar el layout autenticado

### Flujo de Logout

1. El usuario hace clic en cerrar sesion
2. Se llama a `POST /api/auth/logout`
3. El servidor destruye la sesion y limpia la cookie
4. El cliente limpia localStorage y el estado del hook
5. La pagina se recarga, mostrando el formulario de Login

### Flujo de Verificacion de Sesion (al recargar pagina)

1. La pagina se carga y monta el componente `Router`
2. Se muestra el spinner de "Cargando..."
3. `useAuth` verifica localStorage: si hay datos, llama a `/api/auth/me`
4. Si el servidor confirma la sesion, se muestra el Dashboard
5. Si el servidor responde 401, se limpia localStorage y se muestra Login
