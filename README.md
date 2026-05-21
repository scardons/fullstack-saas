# Sistema SaaS Multi-Tenant - Gestión de Proyectos

Prueba técnica desarrollador Full Stack - Sistema Integrado de Gestión.

## Requisitos

- Docker y Docker Compose

## Ejecución

```bash
docker compose up --build
```

## Acceso

- **Frontend:** http://localhost:3000
- **Backend API:** http://localhost:5000

## Credenciales de prueba

| Usuario   | Contraseña    |
|-----------|---------------|
| testuser  | testpassword  |

## Estructura del proyecto

```
fullstack-saas/
├── db/
│   ├── Dockerfile
│   └── init.sql          # Esquema y datos pre-cargados
├── backend/
│   ├── Dockerfile
│   ├── requirements.txt
│   └── app.py            # API Flask (autenticación + proyectos)
├── frontend/
│   ├── Dockerfile
│   ├── package.json
│   ├── public/
│   │   └── index.html
│   └── src/
│       └── App.js        # React (login, workspace selector, dashboard)
├── docker-compose.yml
└── README.md
```

## Datos pre-cargados

| Usuario   | Workspace      | Rol    |
|-----------|----------------|--------|
| testuser  | Workspace Alfa | Admin  |
| testuser  | Workspace Beta | Lector |

Cada workspace tiene 2 proyectos de ejemplo.

## Endpoints de la API

### Autenticación

**POST /api/auth/login**
- Autentica al usuario con credenciales fijas
- Retorna: datos del usuario, lista de workspaces con roles, session token

**POST /api/auth/token**
- Intercambia el session token por un token de workspace
- Requiere: `Authorization: Bearer <session_token>`
- Body: `{ "workspace_id": 1 }`
- Retorna: workspace token y rol

### Proyectos

**GET /api/projects**
- Retorna los proyectos del workspace activo
- Requiere: `Authorization: Bearer <workspace_token>`

**POST /api/projects**
- Crea un nuevo proyecto
- Requiere: rol Admin o Editor
- Body: `{ "name": "...", "description": "..." }`

## Roles y permisos

| Rol    | Ver proyectos | Crear proyectos | Editar proyectos | Eliminar proyectos |
|--------|:-------------:|:---------------:|:----------------:|:------------------:|
| Admin  |       ✓       |        ✓        |        ✓         |         ✓          |
| Editor |       ✓       |        ✓        |        ✓         |         ✗          |
| Lector |       ✓       |        ✗        |        ✗         |         ✗          |

## Proceso de implementación

### 1. Base de datos (PostgreSQL)

- Esquema con tablas: `users`, `workspaces`, `user_workspace_roles`, `projects`
- Contraseña almacenada como hash SHA-256
- Datos pre-cargados para pruebas

### 2. Backend (Flask/Python)

- Endpoints REST para autenticación y CRUD de proyectos
- Autenticación con JWT en dos fases:
  - Token de sesión (login)
  - Token de workspace (intercambio de contexto)
- Middleware de autorización por rol
- Validación de permisos en creación de proyectos

### 3. Frontend (React)

- **Login**: formulario de autenticación
- **Workspace selector**: lista de workspaces con roles
- **Dashboard**: proyectos del workspace activo con botón condicional según rol

### 4. Docker

- Contenedores para db, backend y frontend
- Dockerfile optimizados para cada servicio
- docker-compose.yml con dependencias y variables de entorno
- Los servicios se comunican via Docker network interna
- Frontend se conecta al backend via host (localhost:5000)

## Volumen de base de datos

Para reiniciar la base de datos con datos frescos:

```bash
docker compose down -v
docker compose up --build
```

La bandera `-v` elimina los volúmenes, forzando la recreación de la base de datos desde init.sql.
