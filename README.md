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

## Documentación

- **Spec:** `docs/superpowers/specs/2026-04-03-pascuas-webapp-design.md`
- **Plan Foundation (1/3):** `docs/superpowers/plans/2026-04-03-pascuas-foundation.md`