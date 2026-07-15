// lib/db/index.ts
// Cliente SQLite (better-sqlite3) + Drizzle. La base es un archivo local en
// data/vaultpost.db — se crea y migra sola en el primer arranque.
import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import path from 'path'
import fs from 'fs'
import * as schema from './schema'

const DB_PATH =
  process.env.DATABASE_PATH ?? path.join(process.cwd(), 'data', 'vaultpost.db')

const BOOTSTRAP_SQL = `
CREATE TABLE IF NOT EXISTS companies (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  owner_id    TEXT,
  plan        TEXT NOT NULL DEFAULT 'free',
  created_at  TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS users (
  id             TEXT PRIMARY KEY,
  company_id     TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  email          TEXT NOT NULL UNIQUE,
  password_hash  TEXT NOT NULL,
  full_name      TEXT,
  role           TEXT NOT NULL DEFAULT 'custom' CHECK (role IN ('admin', 'custom')),
  permissions    TEXT NOT NULL DEFAULT '{}',
  created_at     TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS clients (
  id          TEXT PRIMARY KEY,
  company_id  TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  logo_url    TEXT,
  created_at  TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS social_accounts (
  id                TEXT PRIMARY KEY,
  client_id         TEXT NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  platform          TEXT NOT NULL CHECK (platform IN ('instagram', 'facebook', 'tiktok')),
  username          TEXT NOT NULL,
  credentials_enc   TEXT,
  access_token_enc  TEXT,
  last_sync         TEXT,
  is_active         INTEGER NOT NULL DEFAULT 1,
  added_by_id       TEXT,
  created_at        TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS scheduled_posts (
  id                 TEXT PRIMARY KEY,
  social_account_id  TEXT NOT NULL REFERENCES social_accounts(id) ON DELETE CASCADE,
  content_type       TEXT NOT NULL CHECK (content_type IN ('post', 'reel', 'story', 'video')),
  caption            TEXT,
  media_url          TEXT,
  scheduled_at       TEXT NOT NULL,
  status             TEXT NOT NULL DEFAULT 'scheduled'
                     CHECK (status IN ('draft', 'scheduled', 'publishing', 'published', 'failed')),
  error_msg          TEXT,
  created_by_id      TEXT,
  created_at         TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS post_metrics (
  id                 TEXT PRIMARY KEY,
  scheduled_post_id  TEXT NOT NULL REFERENCES scheduled_posts(id) ON DELETE CASCADE,
  likes              INTEGER NOT NULL DEFAULT 0,
  comments           INTEGER NOT NULL DEFAULT 0,
  shares             INTEGER NOT NULL DEFAULT 0,
  reach              INTEGER NOT NULL DEFAULT 0,
  engagement_rate    REAL NOT NULL DEFAULT 0,
  fetched_at         TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_users_company ON users(company_id);
CREATE INDEX IF NOT EXISTS idx_clients_company ON clients(company_id);
CREATE INDEX IF NOT EXISTS idx_accounts_client ON social_accounts(client_id);
CREATE INDEX IF NOT EXISTS idx_posts_account ON scheduled_posts(social_account_id);
CREATE INDEX IF NOT EXISTS idx_posts_status_at ON scheduled_posts(status, scheduled_at);
CREATE INDEX IF NOT EXISTS idx_metrics_post ON post_metrics(scheduled_post_id);
`

function createDb() {
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true })
  const sqlite = new Database(DB_PATH)
  sqlite.pragma('journal_mode = WAL')
  sqlite.pragma('foreign_keys = ON')
  sqlite.exec(BOOTSTRAP_SQL)
  return drizzle(sqlite, { schema })
}

// Singleton: sobrevive a los hot-reloads del dev server de Next
const globalForDb = globalThis as unknown as {
  __vaultpostDb?: ReturnType<typeof createDb>
}

export const db = globalForDb.__vaultpostDb ?? (globalForDb.__vaultpostDb = createDb())

export * as tables from './schema'
