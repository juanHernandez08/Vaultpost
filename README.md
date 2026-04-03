# 🌸 Pascuas — Social Media Manager MVP

Herramienta para agencias de marketing y Community Managers que gestiona **20+ cuentas** de Instagram, TikTok y Facebook desde un único lugar.

## Estructura del proyecto

```
pascuas/
├── apps/
│   ├── backend/          # API REST Node.js + workers de publicación
│   ├── desktop/          # App de escritorio (Electron + React)
│   └── mobile/           # App móvil (React Native — iOS/Android/iPad)
├── packages/
│   ├── vault/            # Cifrado AES-256-GCM de credenciales
│   ├── scheduler/        # Motor de programación con Bull + Redis
│   └── api-clients/      # Clientes Instagram / TikTok / Facebook
└── docs/superpowers/plans/
    └── 2026-03-31-pascuas-mvp.md   # Plan de implementación completo
```

## Requisitos

| Herramienta | Versión mínima | Link |
|-------------|---------------|------|
| Node.js     | 22+           | https://nodejs.org |
| Redis       | 7+            | https://redis.io |
| Docker (opcional) | cualquiera | https://docker.com |

## Inicio rápido

### Windows
```bat
start-windows.bat
```

### macOS / Linux
```bash
./start.sh
```

### Manual
```bash
# 1. Redis (si no tienes instalado)
docker run -d -p 6379:6379 redis:alpine

# 2. Copiar variables de entorno
cp .env.example .env
# Editar .env y cambiar VAULT_MASTER_KEY

# 3. Instalar dependencias
cd apps/backend      && npm install && cd ../..
cd packages/vault    && npm install && cd ../..
cd packages/scheduler && npm install && cd ../..
cd packages/api-clients && npm install && cd ../..

# 4. Iniciar backend
cd apps/backend
NODE_OPTIONS='--experimental-sqlite' npx ts-node src/server.ts

# 5. (Otra terminal) App de escritorio
cd apps/desktop
npm install
npm run dev:renderer   # Abre el renderer en localhost:5173
```

## API REST

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET    | `/clients` | Listar clientes |
| POST   | `/clients` | Crear cliente `{ name }` |
| DELETE | `/clients/:id` | Eliminar cliente |
| GET    | `/accounts` | Listar cuentas sociales |
| POST   | `/accounts` | Crear cuenta `{ client_id, platform, username, password }` |
| DELETE | `/accounts/:id` | Eliminar cuenta |
| GET    | `/posts` | Listar posts programados |
| POST   | `/posts` | Programar post `{ account_id, media_path, caption, scheduled_at }` |
| POST   | `/posts/:id/schedule` | Encolar job de publicación en Redis |
| DELETE | `/posts/:id` | Cancelar post |

## Tests

```bash
# Vault
cd packages/vault && npx jest

# API Clients (Instagram, TikTok, Facebook)
cd packages/api-clients && npx jest

# Scheduler
cd packages/scheduler && npx jest

# Backend completo
cd apps/backend
NODE_OPTIONS='--experimental-sqlite' npx jest
```

## Flujo de publicación

```
CM programa post (UI)
        ↓
POST /posts → SQLite (status: pending)
        ↓
POST /posts/:id/schedule → Bull Queue (delay hasta scheduled_at)
        ↓
Worker despierta → descifra credenciales (vault)
        ↓
Llama API oficial (Instagram / TikTok / Facebook)
        ↓
Actualiza status: done | failed (con reintentos x3)
```

## Variables de entorno

| Variable | Default | Descripción |
|----------|---------|-------------|
| `VAULT_MASTER_KEY` | `change-me-in-prod-32chars!!!!!!!!` | Clave AES-256. **Cambiar antes de producción** |
| `REDIS_URL` | `redis://localhost:6379` | URL de Redis para el scheduler |
| `PORT` | `3001` | Puerto del backend |

## Próximos pasos (post-MVP)

- [ ] OAuth flow embebido para autenticación por cuenta (Playwright + ventana de login)
- [ ] Upload de videos desde disco local → CDN propio
- [ ] Reemplazar SQLite por PostgreSQL para modo SaaS multi-tenant
- [ ] Session Manager con Playwright (perfiles Chromium aislados por cuenta)
- [ ] Métricas avanzadas: reach, engagement rate, comparativas entre cuentas
- [ ] Soporte de Stories (requiere automatización web como fallback)
