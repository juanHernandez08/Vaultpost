// lib/db/index.ts
// Cliente PostgreSQL (node-postgres) + Drizzle. La conexión se toma de
// DATABASE_URL; las tablas se crean solas en el primer arranque.
import { Pool, Client } from 'pg'
import { drizzle } from 'drizzle-orm/node-postgres'
import * as schema from './schema'

const DATABASE_URL = process.env.DATABASE_URL
if (!DATABASE_URL) {
  throw new Error('Falta DATABASE_URL en el entorno (ver .env.example)')
}

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
  permissions    JSONB NOT NULL DEFAULT '{}'::jsonb,
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
  is_active         BOOLEAN NOT NULL DEFAULT TRUE,
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
  engagement_rate    DOUBLE PRECISION NOT NULL DEFAULT 0,
  fetched_at         TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_users_company ON users(company_id);
CREATE INDEX IF NOT EXISTS idx_clients_company ON clients(company_id);
CREATE INDEX IF NOT EXISTS idx_accounts_client ON social_accounts(client_id);
CREATE INDEX IF NOT EXISTS idx_posts_account ON scheduled_posts(social_account_id);
CREATE INDEX IF NOT EXISTS idx_posts_status_at ON scheduled_posts(status, scheduled_at);
CREATE INDEX IF NOT EXISTS idx_metrics_post ON post_metrics(scheduled_post_id);
`

// Crea las tablas con una conexión dedicada (fuera del pool) para que el
// pool pueda esperar a que termine antes de atender la primera consulta.
async function bootstrap(connectionString: string) {
  const client = new Client({ connectionString })
  await client.connect()
  try {
    await client.query(BOOTSTRAP_SQL)
  } finally {
    await client.end()
  }
}

function createDb(connectionString: string) {
  const pool = new Pool({ connectionString })
  const ready = bootstrap(connectionString).catch((err) => {
    console.error('[db] No se pudo inicializar el schema:', err)
    throw err
  })

  // Toda consulta del pool (directa o vía transacción) espera al bootstrap.
  const query = pool.query.bind(pool)
  const connect = pool.connect.bind(pool)
  pool.query = ((...args: Parameters<typeof query>) =>
    ready.then(() => query(...args))) as typeof pool.query
  pool.connect = ((...args: Parameters<typeof connect>) =>
    ready.then(() => connect(...args))) as typeof pool.connect

  return drizzle(pool, { schema })
}

// Singleton: sobrevive a los hot-reloads del dev server de Next
const globalForDb = globalThis as unknown as {
  __vaultpostDb?: ReturnType<typeof createDb>
}

export const db = globalForDb.__vaultpostDb ?? (globalForDb.__vaultpostDb = createDb(DATABASE_URL))

/** Primera fila de un resultado (equivalente al `.get()` de SQLite). */
export const first = <T>(rows: T[]): T | undefined => rows[0]

export * as tables from './schema'
