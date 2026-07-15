# 🌸 Vaultpost — Social Media Manager

Webapp SaaS para agencias y Community Managers que centraliza **20+ cuentas** de Instagram, TikTok y Facebook en un único lugar.

## Stack

| Capa | Tecnología |
|------|-----------|
| Frontend + Backend | Next.js 14 (App Router) + TypeScript |
| Estilos | Tailwind CSS + shadcn/ui |
| Auth + Base de datos | Supabase (PostgreSQL + Auth + Storage) |
| Deploy | Vercel |
| Cifrado | AES-256-GCM |
| Publicación programada | Vercel Cron Jobs |

## Features (v1)

- 🔐 Login único con sesión persistente + sistema de roles (admin / custom)
- 👥 Gestión de usuarios con permisos granulares por cliente
- 📱 Selector de perfiles: Instagram, Facebook y TikTok de cada cliente
- 📅 Programación de posts, reels y stories
- 📊 Analytics: likes, comentarios, reach y engagement por cuenta
- 🏢 Arquitectura multi-tenant lista para SaaS

## Inicio rápido

```bash
npm install
cp .env.example .env.local
# Editar .env.local con tus credenciales de Supabase
npm run dev
```

## Variables de entorno

| Variable | Descripción |
|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | URL del proyecto Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Clave pública de Supabase |
| `SUPABASE_SERVICE_KEY` | Clave de servicio (solo servidor) |
| `ENCRYPTION_KEY` | Clave AES-256 para cifrar credenciales sociales |
| `CRON_SECRET` | Secret para autenticar el cron job de publicación |

## Publicación programada (cron)

El endpoint `/api/cron/publish` publica los posts con `status = 'scheduled'` cuya fecha ya venció. Se autentica con `Authorization: Bearer <CRON_SECRET>`.

- **En Vercel:** `vercel.json` lo programa cada minuto (los crons de Vercel invocan con `GET` y envían el header automáticamente si la variable `CRON_SECRET` está configurada). En el plan Hobby los crons solo corren una vez al día; para frecuencia por minuto se necesita plan Pro.
- **En local / demo:** se puede disparar manualmente:

```bash
curl -X POST http://localhost:3000/api/cron/publish -H "Authorization: Bearer $CRON_SECRET"
```

> Nota: en esta fase el cron marca los posts como `published` sin llamar a las APIs reales de Instagram/Facebook/TikTok (integración prevista para la fase 2).

> ⚠️ **Proyectos gratuitos de Supabase:** se pausan automáticamente tras ~1 semana sin uso y pueden eliminarse tras 90 días. Si el login falla con "No se pudo conectar al servidor", verificá en [supabase.com/dashboard](https://supabase.com/dashboard) que el proyecto siga activo. Si fue eliminado: crear un proyecto nuevo, ejecutar las migraciones (abajo) y actualizar las 3 variables de Supabase en `.env.local`.

## Setup de la base de datos

Ejecutar en orden en el SQL Editor de Supabase:

1. `supabase/migrations/001_schema.sql` — tablas
2. `supabase/migrations/002_rls.sql` — políticas de seguridad (RLS)

No hace falta seed manual: desde `/login` → "Registrate" → "+ Crear nueva empresa" se crea la primera empresa y su usuario admin. (El `003_seed.sql` queda como alternativa por SQL.)

## Documentación

- **Spec:** `docs/superpowers/specs/2026-04-03-pascuas-webapp-design.md`
- **Plan Foundation (1/3):** `docs/superpowers/plans/2026-04-03-pascuas-foundation.md`