# 🌸 Vaultpost — Social Media Manager

Webapp SaaS para agencias y Community Managers que centraliza **20+ cuentas** de Instagram, TikTok y Facebook en un único lugar.

## Stack

| Capa | Tecnología |
|------|-----------|
| Frontend + Backend | Next.js 14 (App Router) + TypeScript |
| Estilos | Tailwind CSS + shadcn/ui |
| Base de datos | SQLite local (better-sqlite3 + Drizzle ORM) — **100% gratis, sin servicios externos** |
| Autenticación | Sesiones propias: bcrypt + JWT (jose) en cookie httpOnly |
| Cifrado | AES-256-GCM para tokens de redes sociales |
| Publicación programada | Endpoint cron autenticado con `CRON_SECRET` |

## Features (v1)

- 🔐 Login y registro con sesión persistente + sistema de roles (admin / custom)
- 🏢 Onboarding completo: crear empresa desde el registro (el primer usuario es admin)
- 👥 Gestión de usuarios con permisos granulares por cliente
- 📱 Selector de perfiles: Instagram, Facebook y TikTok de cada cliente
- 📅 Programación de posts, reels y stories
- 📊 Analytics: likes, comentarios, reach y engagement por cuenta
- 🗄️ Base de datos en un archivo local (`data/vaultpost.db`) — se crea sola al arrancar

## Inicio rápido

```bash
npm install
cp .env.example .env.local
# Editar .env.local: generar ENCRYPTION_KEY, SESSION_SECRET y CRON_SECRET
npm run dev
```

Al abrir `http://localhost:3000` → "Registrate" → "+ Crear nueva empresa". Listo: no hay nada más que configurar.

### Datos de demostración (opcional)

```bash
npm run seed:demo
```

Crea la empresa **Agencia Demo** con 3 clientes, 5 cuentas sociales, 15 posts publicados con métricas y 10 programados. Login: `admin@demo.com` / `VaultpostDemo1`.

## Variables de entorno

| Variable | Descripción |
|----------|-------------|
| `ENCRYPTION_KEY` | Clave AES-256 para cifrar tokens de redes sociales (`openssl rand -hex 32`) |
| `SESSION_SECRET` | Firma de las cookies de sesión (si se omite, se usa `ENCRYPTION_KEY`) |
| `CRON_SECRET` | Secret para autenticar el cron job de publicación |
| `DATABASE_PATH` | (Opcional) ruta del archivo SQLite; por defecto `data/vaultpost.db` |

## Publicación programada (cron)

El endpoint `/api/cron/publish` publica los posts con `status = 'scheduled'` cuya fecha ya venció. Se autentica con `Authorization: Bearer <CRON_SECRET>` y acepta GET o POST:

```bash
curl -X POST http://localhost:3000/api/cron/publish -H "Authorization: Bearer $CRON_SECRET"
```

Para automatizarlo en local se puede usar el Programador de tareas de Windows o un cron de sistema.

> Nota: en esta fase el cron marca los posts como `published` sin llamar a las APIs reales de Instagram/Facebook/TikTok (integración prevista para la fase 2).

## Deploy

La base SQLite vive en el filesystem, así que el deploy necesita un servidor con disco persistente (VPS, Railway, Fly.io, etc.). Para serverless (Vercel) habría que cambiar el driver a [Turso](https://turso.tech) o Postgres ([Neon](https://neon.tech)) — con Drizzle el cambio queda acotado a `lib/db/index.ts`.

## Documentación

- **Spec:** `docs/superpowers/specs/2026-04-03-pascuas-webapp-design.md`
- **Planes:** `docs/superpowers/plans/`
