# 🌸 Vaultpost — Social Media Manager

Webapp SaaS para agencias y Community Managers que centraliza **20+ cuentas** de Instagram, TikTok y Facebook en un único lugar.

## Stack

| Capa | Tecnología |
|------|-----------|
| Frontend + Backend | Next.js 14 (App Router) + TypeScript |
| Estilos | Tailwind CSS + shadcn/ui |
| Base de datos | PostgreSQL (node-postgres + Drizzle ORM) |
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
- 🗄️ Tablas creadas automáticamente en PostgreSQL al arrancar (sin migraciones manuales)

## Inicio rápido

Requiere PostgreSQL (local o remoto). Con `psql`:

```bash
psql -U postgres -h localhost -c "CREATE DATABASE vaultpost ENCODING 'UTF8' TEMPLATE template0;"
```

```bash
npm install
cp .env.example .env.local
# Editar .env.local: DATABASE_URL + generar ENCRYPTION_KEY, SESSION_SECRET y CRON_SECRET
npm run dev
```

Las tablas se crean solas en el primer arranque. Al abrir `http://localhost:3000` → "Registrate" → "+ Crear nueva empresa".

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
| `DATABASE_URL` | Cadena de conexión a PostgreSQL, ej. `postgresql://postgres:pass@localhost:5432/vaultpost` |

## Publicación programada (cron)

El endpoint `/api/cron/publish` publica los posts con `status = 'scheduled'` cuya fecha ya venció. Se autentica con `Authorization: Bearer <CRON_SECRET>` y acepta GET o POST:

```bash
curl -X POST http://localhost:3000/api/cron/publish -H "Authorization: Bearer $CRON_SECRET"
```

Para automatizarlo en local se puede usar el Programador de tareas de Windows o un cron de sistema.

> Las cuentas de Instagram **con access token** publican de verdad vía la API de Meta; las cuentas sin token (y Facebook/TikTok) se marcan como `published` en modo simulación.

## Publicar de verdad en Instagram

Requisitos de Meta para publicar por API:

1. **Cuenta profesional**: en la app de Instagram → Configuración → Tipo de cuenta → cambiar a Empresa o Creador (gratis).
2. **App de Meta**: en [developers.facebook.com](https://developers.facebook.com/) → Crear app → caso de uso con **"API de Instagram"** (login de Instagram Business). En *API setup with Instagram business login* agregá tu cuenta y generá un **access token** (permisos `instagram_business_basic` + `instagram_business_content_publish`).
3. **URL pública para las imágenes**: Meta descarga la imagen desde una URL — tu PC no es pública, así que corré un túnel:
   ```bash
   ngrok http 3000        # o: cloudflared tunnel --url http://localhost:3000
   ```
   y poné la URL que te da en `.env.local`:
   ```
   PUBLIC_BASE_URL=https://xxxx.ngrok-free.app
   ```
4. En Vaultpost: **Admin → Cuentas → Agregar cuenta** → plataforma Instagram, tu username y el access token (se guarda cifrado).
5. **Nuevo Post** → elegí la cuenta, tipo **Story**, subí tu imagen (JPEG), programá la fecha → cuando el cron corra (o lo dispares con el `curl` de arriba), la historia aparece en tu Instagram.

Limitaciones actuales: imágenes JPEG solamente (requisito de Meta para `image_url`); videos/reels quedan para la fase 2. Los tokens de prueba de Meta duran 60 días.

## Deploy

La app es stateless salvo `data/uploads/` (imágenes subidas): sirve en cualquier host con Node (VPS, Railway, Fly.io, Vercel) apuntando `DATABASE_URL` a un Postgres gestionado (Neon, Supabase, RDS…). En serverless conviene un pooler (PgBouncer / pooling del proveedor) y almacenar los uploads en un bucket.

## Documentación

- **Spec:** `docs/superpowers/specs/2026-04-03-pascuas-webapp-design.md`
- **Planes:** `docs/superpowers/plans/`
