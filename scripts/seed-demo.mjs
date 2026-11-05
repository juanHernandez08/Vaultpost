// scripts/seed-demo.mjs
// Crea datos de demostración: empresa, admin, clientes, cuentas, posts y métricas.
// Uso: npm run seed:demo   (requiere DATABASE_URL en .env.local)
// Credenciales resultantes: admin@demo.com / VaultpostDemo1
import pg from 'pg'
import bcrypt from 'bcryptjs'
import { randomUUID } from 'crypto'
import path from 'path'
import fs from 'fs'

// Cargar .env.local a mano (sin depender de Next)
const envPath = path.join(process.cwd(), '.env.local')
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
    if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2]
  }
}

if (!process.env.DATABASE_URL) {
  console.error('Falta DATABASE_URL (ver .env.example)')
  process.exit(1)
}

const client = new pg.Client({ connectionString: process.env.DATABASE_URL })
await client.connect()

// Mismo DDL que lib/db/index.ts (idempotente)
await client.query(`
CREATE TABLE IF NOT EXISTS companies (
  id TEXT PRIMARY KEY, name TEXT NOT NULL, owner_id TEXT,
  plan TEXT NOT NULL DEFAULT 'free', created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY, company_id TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE, password_hash TEXT NOT NULL, full_name TEXT,
  role TEXT NOT NULL DEFAULT 'custom' CHECK (role IN ('admin','custom')),
  permissions JSONB NOT NULL DEFAULT '{}'::jsonb, created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS clients (
  id TEXT PRIMARY KEY, company_id TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL, logo_url TEXT, created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS social_accounts (
  id TEXT PRIMARY KEY, client_id TEXT NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  platform TEXT NOT NULL CHECK (platform IN ('instagram','facebook','tiktok')),
  username TEXT NOT NULL, credentials_enc TEXT, access_token_enc TEXT,
  last_sync TEXT, is_active BOOLEAN NOT NULL DEFAULT TRUE, added_by_id TEXT, created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS scheduled_posts (
  id TEXT PRIMARY KEY, social_account_id TEXT NOT NULL REFERENCES social_accounts(id) ON DELETE CASCADE,
  content_type TEXT NOT NULL CHECK (content_type IN ('post','reel','story','video')),
  caption TEXT, media_url TEXT, scheduled_at TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('draft','scheduled','publishing','published','failed')),
  error_msg TEXT, created_by_id TEXT, created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS post_metrics (
  id TEXT PRIMARY KEY, scheduled_post_id TEXT NOT NULL REFERENCES scheduled_posts(id) ON DELETE CASCADE,
  likes INTEGER NOT NULL DEFAULT 0, comments INTEGER NOT NULL DEFAULT 0,
  shares INTEGER NOT NULL DEFAULT 0, reach INTEGER NOT NULL DEFAULT 0,
  engagement_rate DOUBLE PRECISION NOT NULL DEFAULT 0, fetched_at TEXT NOT NULL
);
`)

const now = () => new Date().toISOString()
const daysFromNow = (d, h = 0) => new Date(Date.now() + d * 864e5 + h * 36e5).toISOString()

const { rows: existing } = await client.query(`SELECT id FROM users WHERE email = $1`, ['admin@demo.com'])
if (existing.length > 0) {
  console.log('Los datos de demo ya existen (admin@demo.com). Nada que hacer.')
  await client.end()
  process.exit(0)
}

const companyId = randomUUID()
const adminId = randomUUID()

await client.query('BEGIN')
try {
  await client.query(
    `INSERT INTO companies (id, name, plan, created_at) VALUES ($1, $2, 'free', $3)`,
    [companyId, 'Agencia Demo', now()]
  )

  await client.query(
    `INSERT INTO users (id, company_id, email, password_hash, full_name, role, permissions, created_at)
     VALUES ($1, $2, $3, $4, $5, 'admin', '{}', $6)`,
    [adminId, companyId, 'admin@demo.com', bcrypt.hashSync('VaultpostDemo1', 10), 'Admin Demo', now()]
  )

  await client.query(`UPDATE companies SET owner_id = $1 WHERE id = $2`, [adminId, companyId])

  const clientsData = [
    { name: 'Café Aurora', accounts: [['instagram', 'cafe.aurora'], ['facebook', 'CafeAuroraOficial']] },
    { name: 'Gimnasio Vital', accounts: [['instagram', 'vital.gym'], ['tiktok', 'vitalgym']] },
    { name: 'Librería El Faro', accounts: [['instagram', 'elfaro.libros']] },
  ]

  const captions = [
    '¡Nueva promo de temporada! ☕ No te la pierdas.',
    'Detrás de escena de nuestro último shooting 📸',
    '5 tips que no sabías sobre nuestros productos',
    'Gracias por acompañarnos, ¡ya somos más de 10k! 🎉',
    'Sorteo especial: comentá y etiquetá a un amigo',
    'Así arranca la semana en nuestro local 💪',
  ]

  const insertClient = (...v) =>
    client.query(`INSERT INTO clients (id, company_id, name, created_at) VALUES ($1, $2, $3, $4)`, v)
  const insertAccount = (...v) =>
    client.query(
      `INSERT INTO social_accounts (id, client_id, platform, username, is_active, added_by_id, created_at)
       VALUES ($1, $2, $3, $4, TRUE, $5, $6)`,
      v
    )
  const insertPost = (...v) =>
    client.query(
      `INSERT INTO scheduled_posts (id, social_account_id, content_type, caption, scheduled_at, status, created_by_id, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      v
    )
  const insertMetrics = (...v) =>
    client.query(
      `INSERT INTO post_metrics (id, scheduled_post_id, likes, comments, shares, reach, engagement_rate, fetched_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      v
    )

  const contentTypes = ['post', 'reel', 'story', 'post', 'video', 'post']
  let captionIdx = 0

  for (const c of clientsData) {
    const clientId = randomUUID()
    await insertClient(clientId, companyId, c.name, now())

    for (const [platform, username] of c.accounts) {
      const accountId = randomUUID()
      await insertAccount(accountId, clientId, platform, username, adminId, now())

      // 3 posts publicados (pasado) con métricas
      for (let i = 1; i <= 3; i++) {
        const postId = randomUUID()
        await insertPost(
          postId, accountId, contentTypes[(captionIdx + i) % contentTypes.length],
          captions[captionIdx % captions.length],
          daysFromNow(-i * 3), 'published', adminId, now()
        )
        captionIdx++
        const likes = 120 + ((captionIdx * 137) % 900)
        const comments = 8 + ((captionIdx * 31) % 60)
        const shares = 3 + ((captionIdx * 17) % 40)
        const reach = 1500 + ((captionIdx * 911) % 9000)
        await insertMetrics(
          randomUUID(), postId, likes, comments, shares, reach,
          Math.round(((likes + comments + shares) / reach) * 10000) / 100, now()
        )
      }

      // 2 posts programados (futuro)
      for (let i = 1; i <= 2; i++) {
        await insertPost(
          randomUUID(), accountId, contentTypes[(captionIdx + i) % contentTypes.length],
          captions[(captionIdx + 2) % captions.length],
          daysFromNow(i * 2, 10), 'scheduled', adminId, now()
        )
        captionIdx++
      }
    }
  }

  await client.query('COMMIT')
} catch (err) {
  await client.query('ROLLBACK')
  throw err
} finally {
  await client.end()
}

console.log('✅ Datos de demo creados.')
console.log('   Empresa: Agencia Demo (3 clientes, 5 cuentas, 15 publicados + 10 programados)')
console.log('   Login:   admin@demo.com / VaultpostDemo1')
