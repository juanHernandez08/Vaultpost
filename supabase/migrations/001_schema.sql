-- supabase/migrations/001_schema.sql
-- Ejecutar en: Supabase Dashboard → SQL Editor → New query

-- Extensión para UUIDs
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Empresas / Agencias
CREATE TABLE companies (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        TEXT NOT NULL,
  owner_id    UUID,
  plan        TEXT NOT NULL DEFAULT 'free',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Perfiles de usuario (extiende auth.users de Supabase)
CREATE TABLE users (
  id           UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id   UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  email        TEXT NOT NULL,
  full_name    TEXT,
  role         TEXT NOT NULL DEFAULT 'custom' CHECK (role IN ('admin', 'custom')),
  permissions  JSONB NOT NULL DEFAULT '{}',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- FK circular: companies.owner_id → users.id (se agrega después de crear users)
ALTER TABLE companies
  ADD CONSTRAINT fk_companies_owner
  FOREIGN KEY (owner_id) REFERENCES users(id);

-- Clientes de la agencia
CREATE TABLE clients (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id  UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  logo_url    TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Cuentas de redes sociales de cada cliente
CREATE TABLE social_accounts (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id        UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  platform         TEXT NOT NULL CHECK (platform IN ('instagram', 'facebook', 'tiktok')),
  username         TEXT NOT NULL,
  credentials_enc  TEXT,
  access_token_enc TEXT,
  last_sync        TIMESTAMPTZ,
  is_active        BOOLEAN NOT NULL DEFAULT true,
  added_by_id      UUID REFERENCES users(id),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Posts programados
CREATE TABLE scheduled_posts (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  social_account_id UUID NOT NULL REFERENCES social_accounts(id) ON DELETE CASCADE,
  content_type      TEXT NOT NULL CHECK (content_type IN ('post', 'reel', 'story', 'video')),
  caption           TEXT,
  media_url         TEXT,
  scheduled_at      TIMESTAMPTZ NOT NULL,
  status            TEXT NOT NULL DEFAULT 'scheduled'
                    CHECK (status IN ('draft', 'scheduled', 'publishing', 'published', 'failed')),
  error_msg         TEXT,
  created_by_id     UUID REFERENCES users(id),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Métricas de posts publicados
CREATE TABLE post_metrics (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  scheduled_post_id UUID NOT NULL REFERENCES scheduled_posts(id) ON DELETE CASCADE,
  likes             INT NOT NULL DEFAULT 0,
  comments          INT NOT NULL DEFAULT 0,
  shares            INT NOT NULL DEFAULT 0,
  reach             INT NOT NULL DEFAULT 0,
  engagement_rate   FLOAT NOT NULL DEFAULT 0,
  fetched_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
