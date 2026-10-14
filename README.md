# task_sac — Tablero de tareas (Kanban) para el equipo

Aplicación web para reemplazar la hoja de Google Sheets de control de tareas.
Cada persona entra con su usuario y mueve sus tareas en un tablero por estados
(**Pendiente**, **En revisión**, **Bloqueo**, **Hecho**), con tiempo real,
roles/permisos, importación/exportación CSV y modo claro/oscuro.

- **Backend:** Node.js 20 + Express + TypeScript
- **Base de datos:** PostgreSQL con Prisma (configurable por `DATABASE_URL`)
- **Frontend:** React + Vite + TypeScript (servido como estático por Express en producción)
- **Drag & drop:** @dnd-kit (funciona con mouse y con toque en celular)
- **Tiempo real:** Server-Sent Events (SSE)
- **Zona horaria:** America/Bogota

---

## Índice

1. [Estructura del proyecto](#estructura-del-proyecto)
2. [Requisitos](#requisitos)
3. [Instalación local (desarrollo)](#instalación-local-desarrollo)
4. [Variables de entorno](#variables-de-entorno)
5. [Crear el administrador inicial](#crear-el-administrador-inicial)
6. [Roles y permisos](#roles-y-permisos)
7. [Importar / exportar CSV](#importar--exportar-csv)
8. [Pruebas](#pruebas)
9. [Construir y levantar con Docker](#construir-y-levantar-con-docker)
10. [Despliegue en Easypanel (VPS)](#despliegue-en-easypanel-vps)
11. [Ejemplo de Nginx con HTTPS](#ejemplo-de-nginx-con-https)
12. [Copia de seguridad de la base de datos](#copia-de-seguridad-de-la-base-de-datos)

---

## Estructura del proyecto

```
task_sac/
├── prisma/              # schema.prisma, migraciones y seed del admin
├── server/              # API Express + TypeScript
│   └── src/
│       ├── auth/        # login, JWT en cookie, bcrypt, CSRF, rate-limit
│       ├── middleware/  # autenticación, autorización, errores
│       ├── tasks/       # rutas, servicio (permisos/orden) y validación zod
│       ├── users/       # gestión de usuarios (solo admin)
│       ├── events/      # SSE (tiempo real)
│       ├── csv/         # importar / exportar
│       └── index.ts     # arranque
├── client/              # React + Vite + TypeScript
│   └── src/
│       ├── auth/        # login, contexto de sesión, cambio de contraseña
│       ├── board/       # tablero Kanban, tarjetas, dnd-kit, filtros, modal
│       ├── users/       # pantalla de administración de usuarios
│       ├── components/  # modal, toasts
│       └── theme/       # claro/oscuro
├── Dockerfile
├── docker-compose.yml   # app + PostgreSQL con volumen persistente
├── docker-entrypoint.sh # migraciones + seed + arranque
├── nginx/               # ejemplo de proxy con HTTPS
└── .env.example
```

---

## Requisitos

- **Node.js 20+** y **npm 10+**
- **PostgreSQL 14+** (para desarrollo local puedes usar el que incluye `docker-compose`)
- Opcional: **Docker** y **Docker Compose** para el despliegue

---

## Instalación local (desarrollo)

```bash
# 1. Instalar dependencias (monorepo con workspaces)
npm install

# 2. Copiar variables de entorno y ajustarlas
cp .env.example .env
#   - Define DATABASE_URL apuntando a tu PostgreSQL local
#   - Define JWT_SECRET, ADMIN_EMAIL y ADMIN_PASSWORD

# 3. (Opción rápida) Levantar solo PostgreSQL con Docker:
docker compose up -d db
#   Deja DATABASE_URL="postgresql://task_user:task_password@localhost:5432/task_sac?schema=public"

# 4. Generar el cliente Prisma y aplicar el esquema a la base
npm run prisma:generate
npm run prisma:migrate:dev        # crea las migraciones y la estructura

# 5. Crear el administrador inicial
npm run seed:admin

# 6. Levantar backend (:3000) y frontend (:5173) a la vez
npm run dev
```

Abre **http://localhost:5173**. El frontend hace proxy de `/api` al backend en
`http://localhost:3000`.

> En **producción** no se usa Vite: Express sirve el frontend ya compilado desde
> `client/dist`. Ver [Docker](#construir-y-levantar-con-docker).

---

## Variables de entorno

Todas se documentan en [`.env.example`](.env.example). Las principales:

| Variable | Descripción |
|---|---|
| `NODE_ENV` | `development` / `production` / `test` |
| `PORT` | Puerto del servidor (por defecto 3000) |
| `DATABASE_URL` | Cadena de conexión a PostgreSQL |
| `JWT_SECRET` | Clave para firmar los JWT de sesión (larga y aleatoria) |
| `SESSION_TTL` | Duración de la sesión (`8h`, `1d`, `7d`, …) |
| `COOKIE_NAME` | Nombre de la cookie de sesión |
| `COOKIE_SECURE` | `true` detrás de HTTPS (producción) |
| `CORS_ORIGINS` | Orígenes permitidos en dev (coma-separados) |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | Datos del admin inicial (seed) |
| `ADMIN_NAME` / `ADMIN_CARGO` | Nombre y cargo del admin inicial |
| `TZ` | Zona horaria (`America/Bogota`) |

> **Seguridad:** nunca subas tu `.env` real al repositorio. En producción define
> las variables en el panel (Easypanel), no en el código.

Genera un `JWT_SECRET` seguro:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

---

## Crear el administrador inicial

Al primer arranque, si **no hay usuarios**, se crea un admin con `ADMIN_EMAIL` y
`ADMIN_PASSWORD`. Puedes forzarlo con:

```bash
npm run seed:admin
```

Es **idempotente**: si ya existen usuarios, no hace nada. Con Docker, el seed se
ejecuta automáticamente en el arranque (`docker-entrypoint.sh`).

---

## Roles y permisos

Los permisos se validan **siempre en el backend** (no solo en la interfaz):

- **Admin:** crea/edita/desactiva usuarios; ve el tablero de todo el equipo;
  filtra por responsable; crea y asigna tareas a cualquiera; edita y elimina
  cualquier tarea. No se puede quitar/desactivar al **último admin activo**.
- **Miembro:** solo ve sus propias tareas; crea tareas para sí mismo; edita y
  mueve solo las suyas; **no** puede reasignarlas ni ver las de otros.

---

## Importar / exportar CSV

Columnas (iguales a la hoja original):

```
Responsable | Tarea | Descripción | Estado | Fecha Inicio | Fecha Fin | Trabajo
```

- **Exportar:** botón **CSV** en la barra (exporta lo que estás viendo, respeta
  los filtros). Incluye BOM para que Excel reconozca los acentos.
- **Importar (solo admin):** botón **Importar**. El *Responsable* se empareja por
  **correo** o por **nombre**. Fechas aceptadas: `AAAA-MM-DD` o `DD/MM/AAAA`.
  Al terminar muestra cuántas se crearon y los errores por fila.

---

## Pruebas

Pruebas de endpoints de autenticación y permisos (un miembro no puede ver ni
editar tareas ajenas, el admin sí, etc.). Requieren una base de datos de prueba.

```bash
# 1. Levanta PostgreSQL (si no lo tienes) y aplica el esquema
docker compose up -d db
DATABASE_URL="postgresql://task_user:task_password@localhost:5432/task_sac?schema=public" \
  npm run prisma:migrate

# 2. Ejecuta las pruebas (NODE_ENV=test)
cd server
NODE_ENV=test \
JWT_SECRET=clave-de-prueba-super-larga \
DATABASE_URL="postgresql://task_user:task_password@localhost:5432/task_sac?schema=public" \
  npm test
```

> Las pruebas limpian las tablas antes y después; usa una base dedicada a tests.

---

## Construir y levantar con Docker

El `docker-compose.yml` incluye **app + PostgreSQL** con un **volumen persistente**
(`db_data`). Ideal para un servidor propio.

```bash
# 1. Prepara el .env (en la raíz) con al menos:
#    JWT_SECRET, ADMIN_EMAIL, ADMIN_PASSWORD
#    POSTGRES_USER / POSTGRES_PASSWORD / POSTGRES_DB (credenciales del Postgres del compose)
cp .env.example .env && nano .env

# 2. Construir y levantar
docker compose up -d --build

# 3. Ver logs (migraciones + seed + arranque)
docker compose logs -f app
```

La app queda en `http://SERVIDOR:3000`. En el arranque se aplican las
migraciones (`prisma migrate deploy`) y se crea el admin inicial.

Para actualizar tras cambios de código:

```bash
git pull
docker compose up -d --build
```

---

## Despliegue en Easypanel (VPS)

En la VPS ya existe un **PostgreSQL 17** gestionado por Easypanel
(servicio interno `n8n_postgres`), así que **no** se usa el servicio `db` del
compose: la app se conecta a esa base por la **red interna** de Docker.

**Pasos:**

1. **Base de datos:** se crea una base `task_sac` con su usuario en el Postgres
   existente. La conexión queda así (va como **variable de entorno**, nunca en el repo):

   ```
   DATABASE_URL=postgresql://task_user:********@n8n_postgres:5432/task_sac?schema=public
   ```

2. **Crear el servicio (App) en Easypanel:**
   - Tipo: **App** desde **repositorio Git**, build con **Dockerfile** (el de este repo).
   - **Red:** adjunta el servicio a la red donde vive Postgres (`easypanel` o
     `easypanel-n8n`) para que resuelva el host `n8n_postgres`.
   - **Puerto interno:** `3000`.

3. **Variables de entorno del servicio** (en Easypanel → Environment):

   ```
   NODE_ENV=production
   PORT=3000
   DATABASE_URL=postgresql://task_user:********@n8n_postgres:5432/task_sac?schema=public
   JWT_SECRET=<genera uno largo y aleatorio>
   COOKIE_SECURE=true
   SESSION_TTL=8h
   TZ=America/Bogota
   ADMIN_EMAIL=admin@empresa.com
   ADMIN_PASSWORD=<clave fuerte>
   ADMIN_NAME=Administrador
   ADMIN_CARGO=Administración
   ```

4. **Dominio y HTTPS:** asigna el dominio (p. ej. `tareas.tudominio.com`) en la
   pestaña Domains del servicio. Easypanel (Traefik + Let's Encrypt) gestiona el
   **HTTPS automáticamente**; apunta el puerto del dominio al **3000**.

5. **Arranque:** el contenedor ejecuta `prisma migrate deploy` (crea el esquema
   en la base vacía) y el seed del admin, luego inicia el servidor.

> **Importante:** el puerto de Postgres no está expuesto a internet; la app debe
> estar en la misma red Docker interna. Para desarrollo local **no** puedes usar
> `n8n_postgres` (usa tu propio Postgres).

---

## Ejemplo de Nginx con HTTPS

Si despliegas en un servidor propio **sin** Easypanel/Traefik, usa
[`nginx/tareas.ejemplo.conf`](nginx/tareas.ejemplo.conf) como proxy inverso
(incluye el ajuste necesario para SSE). Resumen:

```bash
sudo cp nginx/tareas.ejemplo.conf /etc/nginx/sites-available/tareas.conf
sudo ln -s /etc/nginx/sites-available/tareas.conf /etc/nginx/sites-enabled/
sudo certbot --nginx -d tareas.midominio.com   # certificado Let's Encrypt
sudo nginx -t && sudo systemctl reload nginx
```

---

## Copia de seguridad de la base de datos

**Con el `docker-compose` de este repo** (servicio `db`):

```bash
# Backup (genera un archivo .sql con fecha)
docker compose exec -T db pg_dump -U task_user task_sac > backup_$(date +%F).sql

# Restaurar
cat backup_2026-10-14.sql | docker compose exec -T db psql -U task_user -d task_sac
```

**En Easypanel (Postgres `n8n_postgres`)**, desde la VPS:

```bash
# Backup
docker exec -t n8n_postgres pg_dump -U task_user task_sac > task_sac_$(date +%F).sql

# Restaurar
cat task_sac_2026-10-14.sql | docker exec -i n8n_postgres psql -U task_user -d task_sac
```

> Recomendación: programa un `pg_dump` diario (cron) y guarda las copias fuera
> de la VPS.

---

## Licencia

Uso interno del equipo.
