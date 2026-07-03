# Pascuas – Social Media Manager MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Construir una aplicación de escritorio (Windows/macOS/Linux) + móvil (iOS/Android) que permita a agencias de marketing y Community Managers gestionar 20+ cuentas de Instagram, TikTok y Facebook desde un único lugar, con sesiones aisladas, programación de contenido y dashboard de métricas.

**Architecture:** Monorepo con backend Node.js (API REST + workers de publicación), app de escritorio Electron y app móvil React Native que comparten la misma capa de UI en React. Cada cuenta de cliente opera en un perfil de navegador Chromium aislado (via Playwright) con su propio contexto de cookies/localStorage, combinado con las APIs oficiales de Meta y TikTok donde estén disponibles. Las credenciales se almacenan cifradas con AES-256.

**Tech Stack:** Node.js 20, TypeScript, Electron 30, React Native 0.74, React 18, Playwright 1.44, Bull (job queues), SQLite (vía better-sqlite3 para desktop) + PostgreSQL (para SaaS futuro), Instagram Graph API, TikTok Content Posting API, Facebook Graph API, AES-256-GCM (crypto nativo de Node), Turborepo (monorepo).

---

## Estructura de Archivos del Monorepo

```
pascuas/
├── apps/
│   ├── desktop/          # Electron app
│   ├── mobile/           # React Native app
│   └── backend/          # API + workers Node.js
├── packages/
│   ├── ui/               # Componentes React compartidos
│   ├── session-manager/  # Aislamiento de sesiones Playwright
│   ├── scheduler/        # Motor de programación con Bull
│   ├── vault/            # Cifrado de credenciales
│   └── api-clients/      # Clientes Instagram/TikTok/Facebook
├── turbo.json
└── package.json
```

---

## Task 1: Scaffolding del Monorepo

**Files:**
- Create: `package.json` (raíz)
- Create: `turbo.json`
- Create: `apps/backend/package.json`
- Create: `apps/desktop/package.json`
- Create: `apps/mobile/package.json`
- Create: `packages/ui/package.json`

- [ ] **Step 1: Inicializar el monorepo con Turborepo**

```bash
npx create-turbo@latest pascuas --package-manager npm
cd pascuas
```

- [ ] **Step 2: Ajustar `turbo.json` para los pipelines**

```json
{
  "$schema": "https://turbo.build/schema.json",
  "pipeline": {
    "build": { "dependsOn": ["^build"], "outputs": ["dist/**"] },
    "dev": { "cache": false, "persistent": true },
    "test": { "dependsOn": ["^build"] }
  }
}
```

- [ ] **Step 3: Crear estructura de carpetas**

```bash
mkdir -p apps/backend apps/desktop apps/mobile
mkdir -p packages/ui packages/session-manager packages/scheduler packages/vault packages/api-clients
```

- [ ] **Step 4: Inicializar `apps/backend`**

```bash
cd apps/backend
npm init -y
npm install express typescript ts-node @types/node @types/express better-sqlite3 bull dotenv uuid
npm install -D jest ts-jest @types/jest
npx tsc --init
```

- [ ] **Step 5: Commit inicial**

```bash
git init
git add .
git commit -m "chore: scaffold monorepo with turborepo"
```

---

## Task 2: Base de Datos y Modelos (Backend)

**Files:**
- Create: `apps/backend/src/db/schema.ts`
- Create: `apps/backend/src/db/migrate.ts`
- Test: `apps/backend/src/db/__tests__/schema.test.ts`

- [ ] **Step 1: Escribir el test del schema**

```typescript
// apps/backend/src/db/__tests__/schema.test.ts
import { initDb, getDb } from '../migrate';
import fs from 'fs';

const TEST_DB = '/tmp/pascuas_test.db';

afterEach(() => { if (fs.existsSync(TEST_DB)) fs.unlinkSync(TEST_DB); });

test('creates all tables on init', () => {
  initDb(TEST_DB);
  const db = getDb();
  const tables = db.prepare(
    "SELECT name FROM sqlite_master WHERE type='table'"
  ).all().map((r: any) => r.name);
  expect(tables).toContain('clients');
  expect(tables).toContain('accounts');
  expect(tables).toContain('posts');
});

test('accounts belong to clients via FK', () => {
  initDb(TEST_DB);
  const db = getDb();
  db.prepare("INSERT INTO clients (id, name) VALUES ('c1', 'Agencia Test')").run();
  db.prepare("INSERT INTO accounts (id, client_id, platform, username) VALUES ('a1', 'c1', 'instagram', '@test')").run();
  const acc = db.prepare("SELECT * FROM accounts WHERE id='a1'").get() as any;
  expect(acc.client_id).toBe('c1');
});
```

- [ ] **Step 2: Ejecutar test — debe fallar**

```bash
cd apps/backend && npx jest src/db/__tests__/schema.test.ts
# Expected: FAIL — Cannot find module '../migrate'
```

- [ ] **Step 3: Implementar `schema.ts` y `migrate.ts`**

```typescript
// apps/backend/src/db/schema.ts
export const SCHEMA = `
  CREATE TABLE IF NOT EXISTS clients (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    created_at INTEGER DEFAULT (unixepoch())
  );

  CREATE TABLE IF NOT EXISTS accounts (
    id TEXT PRIMARY KEY,
    client_id TEXT NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    platform TEXT NOT NULL CHECK(platform IN ('instagram','tiktok','facebook')),
    username TEXT NOT NULL,
    credentials_enc TEXT,  -- AES-256-GCM cifrado, ver vault package
    session_path TEXT,     -- path al perfil Playwright en disco
    created_at INTEGER DEFAULT (unixepoch())
  );

  CREATE TABLE IF NOT EXISTS posts (
    id TEXT PRIMARY KEY,
    account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    media_path TEXT NOT NULL,
    caption TEXT,
    scheduled_at INTEGER NOT NULL,  -- unix timestamp UTC
    status TEXT DEFAULT 'pending' CHECK(status IN ('pending','publishing','done','failed')),
    error_msg TEXT,
    created_at INTEGER DEFAULT (unixepoch())
  );
`;
```

```typescript
// apps/backend/src/db/migrate.ts
import Database from 'better-sqlite3';
import { SCHEMA } from './schema';

let db: Database.Database;

export function initDb(path = './pascuas.db') {
  db = new Database(path);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  db.exec(SCHEMA);
}

export function getDb() {
  if (!db) throw new Error('DB not initialized. Call initDb() first.');
  return db;
}
```

- [ ] **Step 4: Ejecutar test — debe pasar**

```bash
cd apps/backend && npx jest src/db/__tests__/schema.test.ts
# Expected: PASS (2 tests)
```

- [ ] **Step 5: Commit**

```bash
git add apps/backend/src/db/
git commit -m "feat: sqlite schema for clients, accounts, posts"
```

---

## Task 3: Vault de Credenciales (package/vault)

**Files:**
- Create: `packages/vault/src/index.ts`
- Test: `packages/vault/src/__tests__/vault.test.ts`

- [ ] **Step 1: Escribir test del vault**

```typescript
// packages/vault/src/__tests__/vault.test.ts
import { encrypt, decrypt } from '../index';

const MASTER_KEY = 'test-master-key-32-bytes-padding!'; // 32 chars para AES-256

test('encrypt returns a non-plain string', () => {
  const enc = encrypt('mypassword123', MASTER_KEY);
  expect(enc).not.toBe('mypassword123');
  expect(enc).toContain(':'); // formato iv:authTag:ciphertext
});

test('decrypt returns the original value', () => {
  const enc = encrypt('mypassword123', MASTER_KEY);
  const dec = decrypt(enc, MASTER_KEY);
  expect(dec).toBe('mypassword123');
});

test('decrypt with wrong key throws', () => {
  const enc = encrypt('mypassword123', MASTER_KEY);
  expect(() => decrypt(enc, 'wrong-key-32-bytes-padding!!!!!!')).toThrow();
});
```

- [ ] **Step 2: Ejecutar test — debe fallar**

```bash
cd packages/vault && npx jest
# Expected: FAIL — Cannot find module '../index'
```

- [ ] **Step 3: Implementar vault con AES-256-GCM**

```typescript
// packages/vault/src/index.ts
import { createCipheriv, createDecipheriv, randomBytes, createHash } from 'crypto';

function deriveKey(masterKey: string): Buffer {
  // SHA-256 del master key para obtener exactamente 32 bytes
  return createHash('sha256').update(masterKey).digest();
}

export function encrypt(plaintext: string, masterKey: string): string {
  const key = deriveKey(masterKey);
  const iv = randomBytes(12); // 96 bits para GCM
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  // formato: iv(hex):authTag(hex):ciphertext(hex)
  return [iv.toString('hex'), authTag.toString('hex'), encrypted.toString('hex')].join(':');
}

export function decrypt(encoded: string, masterKey: string): string {
  const key = deriveKey(masterKey);
  const [ivHex, authTagHex, ciphertextHex] = encoded.split(':');
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');
  const ciphertext = Buffer.from(ciphertextHex, 'hex');
  const decipher = createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(authTag);
  return decipher.update(ciphertext).toString('utf8') + decipher.final('utf8');
}
```

- [ ] **Step 4: Ejecutar test — debe pasar**

```bash
cd packages/vault && npx jest
# Expected: PASS (3 tests)
```

- [ ] **Step 5: Commit**

```bash
git add packages/vault/
git commit -m "feat: AES-256-GCM vault for credential encryption"
```

---

## Task 4: Session Manager — Aislamiento de Cuentas con Playwright

**Files:**
- Create: `packages/session-manager/src/index.ts`
- Test: `packages/session-manager/src/__tests__/session.test.ts`

- [ ] **Step 1: Instalar Playwright en el package**

```bash
cd packages/session-manager
npm init -y
npm install playwright @playwright/test typescript
npx playwright install chromium
```

- [ ] **Step 2: Escribir test del session manager**

```typescript
// packages/session-manager/src/__tests__/session.test.ts
import { SessionManager } from '../index';
import fs from 'fs';
import path from 'path';

const SESSIONS_DIR = '/tmp/pascuas_sessions_test';

afterAll(() => fs.rmSync(SESSIONS_DIR, { recursive: true, force: true }));

test('creates isolated session directory per account', async () => {
  const sm = new SessionManager(SESSIONS_DIR);
  const ctx = await sm.getContext('account-001');
  expect(fs.existsSync(path.join(SESSIONS_DIR, 'account-001'))).toBe(true);
  await ctx.close();
  await sm.closeAll();
}, 30000);

test('two accounts get different contexts', async () => {
  const sm = new SessionManager(SESSIONS_DIR);
  const ctx1 = await sm.getContext('account-A');
  const ctx2 = await sm.getContext('account-B');
  expect(ctx1).not.toBe(ctx2);
  await ctx1.close();
  await ctx2.close();
  await sm.closeAll();
}, 30000);
```

- [ ] **Step 3: Ejecutar test — debe fallar**

```bash
cd packages/session-manager && npx jest
# Expected: FAIL — Cannot find module '../index'
```

- [ ] **Step 4: Implementar SessionManager**

```typescript
// packages/session-manager/src/index.ts
import { chromium, BrowserContext } from 'playwright';
import path from 'path';
import fs from 'fs';

export class SessionManager {
  private sessions: Map<string, BrowserContext> = new Map();
  private sessionsDir: string;

  constructor(sessionsDir = './sessions') {
    this.sessionsDir = sessionsDir;
    fs.mkdirSync(sessionsDir, { recursive: true });
  }

  async getContext(accountId: string): Promise<BrowserContext> {
    if (this.sessions.has(accountId)) {
      return this.sessions.get(accountId)!;
    }
    const profileDir = path.join(this.sessionsDir, accountId);
    fs.mkdirSync(profileDir, { recursive: true });

    // Persistent context: cookies y localStorage sobreviven entre sesiones
    const ctx = await chromium.launchPersistentContext(profileDir, {
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-blink-features=AutomationControlled', // reduce detección
        '--disable-dev-shm-usage',
      ],
      userAgent:
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      viewport: { width: 1280, height: 800 },
    });

    this.sessions.set(accountId, ctx);
    return ctx;
  }

  async closeAll() {
    for (const [, ctx] of this.sessions) {
      await ctx.close().catch(() => {});
    }
    this.sessions.clear();
  }
}
```

- [ ] **Step 5: Ejecutar test — debe pasar**

```bash
cd packages/session-manager && npx jest
# Expected: PASS (2 tests)
```

- [ ] **Step 6: Commit**

```bash
git add packages/session-manager/
git commit -m "feat: playwright session manager with isolated chromium profiles"
```

---

## Task 5: API Clients — Instagram, Facebook, TikTok

**Files:**
- Create: `packages/api-clients/src/instagram.ts`
- Create: `packages/api-clients/src/facebook.ts`
- Create: `packages/api-clients/src/tiktok.ts`
- Create: `packages/api-clients/src/index.ts`
- Test: `packages/api-clients/src/__tests__/clients.test.ts`

> **Nota de arquitectura:** Instagram Reels y Facebook usan Meta Graph API (requiere token OAuth por cuenta). TikTok usa Content Posting API (requiere OAuth 2.0). Donde la API no soporte un tipo de post (ej. TikTok Stories), se usa el SessionManager como fallback.

- [ ] **Step 1: Escribir tests con mocks de fetch**

```typescript
// packages/api-clients/src/__tests__/clients.test.ts
import { InstagramClient } from '../instagram';
import { TikTokClient } from '../tiktok';

// Mock global fetch
global.fetch = jest.fn();

afterEach(() => jest.clearAllMocks());

test('InstagramClient.uploadReel sends correct API call', async () => {
  (fetch as jest.Mock).mockResolvedValue({
    ok: true,
    json: async () => ({ id: 'media_123' }),
  });
  const client = new InstagramClient({ accessToken: 'tok123', igUserId: 'usr456' });
  const result = await client.uploadReel({ videoUrl: 'https://cdn.example.com/video.mp4', caption: 'Test' });
  expect(result.id).toBe('media_123');
  expect((fetch as jest.Mock).mock.calls[0][0]).toContain('graph.facebook.com');
});

test('TikTokClient.uploadVideo sends correct API call', async () => {
  (fetch as jest.Mock).mockResolvedValue({
    ok: true,
    json: async () => ({ data: { publish_id: 'pub_789' } }),
  });
  const client = new TikTokClient({ accessToken: 'tiktok_tok' });
  const result = await client.uploadVideo({ videoUrl: 'https://cdn.example.com/video.mp4', title: 'Test' });
  expect(result.publish_id).toBe('pub_789');
});
```

- [ ] **Step 2: Ejecutar test — debe fallar**

```bash
cd packages/api-clients && npx jest
# Expected: FAIL
```

- [ ] **Step 3: Implementar InstagramClient**

```typescript
// packages/api-clients/src/instagram.ts
interface InstagramConfig { accessToken: string; igUserId: string; }
interface ReelPayload { videoUrl: string; caption?: string; }

export class InstagramClient {
  private base = 'https://graph.facebook.com/v19.0';
  constructor(private config: InstagramConfig) {}

  async uploadReel(payload: ReelPayload): Promise<{ id: string }> {
    // Paso 1: Crear container de media
    const containerRes = await fetch(
      `${this.base}/${this.config.igUserId}/media`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          media_type: 'REELS',
          video_url: payload.videoUrl,
          caption: payload.caption ?? '',
          access_token: this.config.accessToken,
        }),
      }
    );
    if (!containerRes.ok) throw new Error(`IG container error: ${await containerRes.text()}`);
    const container = await containerRes.json() as { id: string };

    // Paso 2: Publicar container
    const publishRes = await fetch(
      `${this.base}/${this.config.igUserId}/media_publish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          creation_id: container.id,
          access_token: this.config.accessToken,
        }),
      }
    );
    if (!publishRes.ok) throw new Error(`IG publish error: ${await publishRes.text()}`);
    return publishRes.json();
  }
}
```

- [ ] **Step 4: Implementar TikTokClient**

```typescript
// packages/api-clients/src/tiktok.ts
interface TikTokConfig { accessToken: string; }
interface VideoPayload { videoUrl: string; title: string; }

export class TikTokClient {
  private base = 'https://open.tiktokapis.com/v2';
  constructor(private config: TikTokConfig) {}

  async uploadVideo(payload: VideoPayload): Promise<{ publish_id: string }> {
    const res = await fetch(`${this.base}/post/publish/video/init/`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.config.accessToken}`,
        'Content-Type': 'application/json; charset=UTF-8',
      },
      body: JSON.stringify({
        post_info: { title: payload.title, privacy_level: 'PUBLIC_TO_EVERYONE', disable_comment: false },
        source_info: { source: 'PULL_FROM_URL', video_url: payload.videoUrl },
      }),
    });
    if (!res.ok) throw new Error(`TikTok error: ${await res.text()}`);
    const data = await res.json() as { data: { publish_id: string } };
    return data.data;
  }
}
```

- [ ] **Step 5: Implementar FacebookClient**

```typescript
// packages/api-clients/src/facebook.ts
interface FacebookConfig { accessToken: string; pageId: string; }
interface FbReelPayload { videoUrl: string; description?: string; }

export class FacebookClient {
  private base = 'https://graph.facebook.com/v19.0';
  constructor(private config: FacebookConfig) {}

  async uploadReel(payload: FbReelPayload): Promise<{ id: string }> {
    const res = await fetch(
      `${this.base}/${this.config.pageId}/video_reels`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          upload_phase: 'finish',
          video_url: payload.videoUrl,
          description: payload.description ?? '',
          access_token: this.config.accessToken,
          published: true,
        }),
      }
    );
    if (!res.ok) throw new Error(`FB reel error: ${await res.text()}`);
    return res.json();
  }
}
```

- [ ] **Step 6: Crear barrel export**

```typescript
// packages/api-clients/src/index.ts
export { InstagramClient } from './instagram';
export { FacebookClient } from './facebook';
export { TikTokClient } from './tiktok';
```

- [ ] **Step 7: Ejecutar tests — deben pasar**

```bash
cd packages/api-clients && npx jest
# Expected: PASS (2 tests)
```

- [ ] **Step 8: Commit**

```bash
git add packages/api-clients/
git commit -m "feat: api clients for instagram reels, facebook reels, tiktok"
```

---

## Task 6: Scheduler — Motor de Publicación con Bull

**Files:**
- Create: `packages/scheduler/src/index.ts`
- Create: `packages/scheduler/src/worker.ts`
- Test: `packages/scheduler/src/__tests__/scheduler.test.ts`

> Bull requiere Redis. Para desarrollo local usar Redis vía Docker: `docker run -d -p 6379:6379 redis:alpine`

- [ ] **Step 1: Instalar dependencias**

```bash
cd packages/scheduler
npm init -y
npm install bull ioredis typescript
npm install -D @types/bull jest ts-jest
```

- [ ] **Step 2: Escribir test del scheduler**

```typescript
// packages/scheduler/src/__tests__/scheduler.test.ts
import { Scheduler } from '../index';

// Mock Bull para no necesitar Redis en tests
jest.mock('bull', () => {
  return jest.fn().mockImplementation(() => ({
    add: jest.fn().mockResolvedValue({ id: 'job_mock_123' }),
    process: jest.fn(),
    on: jest.fn(),
  }));
});

test('schedulePost returns a job id', async () => {
  const scheduler = new Scheduler('redis://localhost:6379');
  const jobId = await scheduler.schedulePost({
    postId: 'post_001',
    accountId: 'acc_001',
    platform: 'instagram',
    scheduledAt: new Date(Date.now() + 3600 * 1000), // 1 hora en el futuro
  });
  expect(jobId).toBe('job_mock_123');
});

test('schedulePost throws for past dates', async () => {
  const scheduler = new Scheduler('redis://localhost:6379');
  await expect(
    scheduler.schedulePost({
      postId: 'post_002',
      accountId: 'acc_001',
      platform: 'tiktok',
      scheduledAt: new Date(Date.now() - 1000), // pasado
    })
  ).rejects.toThrow('Cannot schedule a post in the past');
});
```

- [ ] **Step 3: Ejecutar test — debe fallar**

```bash
cd packages/scheduler && npx jest
# Expected: FAIL — Cannot find module '../index'
```

- [ ] **Step 4: Implementar Scheduler**

```typescript
// packages/scheduler/src/index.ts
import Bull from 'bull';

export interface SchedulePostPayload {
  postId: string;
  accountId: string;
  platform: 'instagram' | 'tiktok' | 'facebook';
  scheduledAt: Date;
}

export class Scheduler {
  private queue: Bull.Queue;

  constructor(redisUrl: string) {
    this.queue = new Bull('post-publishing', redisUrl);
  }

  async schedulePost(payload: SchedulePostPayload): Promise<string> {
    const delay = payload.scheduledAt.getTime() - Date.now();
    if (delay < 0) throw new Error('Cannot schedule a post in the past');
    const job = await this.queue.add(payload, { delay, attempts: 3, backoff: { type: 'exponential', delay: 5000 } });
    return String(job.id);
  }

  // Llamado una vez al arrancar el backend
  startWorker(handler: (job: Bull.Job<SchedulePostPayload>) => Promise<void>) {
    this.queue.process(handler);
    this.queue.on('failed', (job, err) => {
      console.error(`Job ${job.id} failed:`, err.message);
    });
  }
}
```

- [ ] **Step 5: Implementar worker de publicación**

```typescript
// packages/scheduler/src/worker.ts
import Bull from 'bull';
import { SchedulePostPayload } from './index';

// Este handler se pasa a scheduler.startWorker() desde el backend
export async function publishHandler(job: Bull.Job<SchedulePostPayload>): Promise<void> {
  const { postId, accountId, platform } = job.data;
  console.log(`[worker] Publishing post ${postId} on ${platform} for account ${accountId}`);

  // El backend importa los api-clients y la DB — el worker solo dispara el evento
  // La lógica real se inyecta desde apps/backend/src/server.ts
  throw new Error('publishHandler must be overridden by backend before use');
}
```

- [ ] **Step 6: Ejecutar tests — deben pasar**

```bash
cd packages/scheduler && npx jest
# Expected: PASS (2 tests)
```

- [ ] **Step 7: Commit**

```bash
git add packages/scheduler/
git commit -m "feat: bull-based scheduler with delay queue and retry logic"
```

---

## Task 7: Backend API REST (Express)

**Files:**
- Create: `apps/backend/src/server.ts`
- Create: `apps/backend/src/routes/clients.ts`
- Create: `apps/backend/src/routes/accounts.ts`
- Create: `apps/backend/src/routes/posts.ts`
- Test: `apps/backend/src/__tests__/api.test.ts`

- [ ] **Step 1: Instalar dependencias adicionales**

```bash
cd apps/backend
npm install supertest multer
npm install -D @types/supertest @types/multer
```

- [ ] **Step 2: Escribir tests de la API**

```typescript
// apps/backend/src/__tests__/api.test.ts
import request from 'supertest';
import { createApp } from '../server';
import { initDb } from '../db/migrate';

let app: ReturnType<typeof createApp>;

beforeAll(() => {
  initDb('/tmp/pascuas_api_test.db');
  app = createApp();
});

test('POST /clients crea un cliente', async () => {
  const res = await request(app)
    .post('/clients')
    .send({ name: 'Agencia XYZ' });
  expect(res.status).toBe(201);
  expect(res.body.name).toBe('Agencia XYZ');
  expect(res.body.id).toBeDefined();
});

test('GET /clients retorna lista', async () => {
  const res = await request(app).get('/clients');
  expect(res.status).toBe(200);
  expect(Array.isArray(res.body)).toBe(true);
});

test('POST /posts valida scheduled_at en el pasado', async () => {
  const res = await request(app)
    .post('/posts')
    .send({
      account_id: 'acc_fake',
      media_path: '/tmp/video.mp4',
      scheduled_at: new Date(Date.now() - 1000).toISOString(),
    });
  expect(res.status).toBe(400);
  expect(res.body.error).toMatch(/future/i);
});
```

- [ ] **Step 3: Ejecutar test — debe fallar**

```bash
cd apps/backend && npx jest src/__tests__/api.test.ts
# Expected: FAIL
```

- [ ] **Step 4: Implementar `server.ts`**

```typescript
// apps/backend/src/server.ts
import express from 'express';
import { clientsRouter } from './routes/clients';
import { accountsRouter } from './routes/accounts';
import { postsRouter } from './routes/posts';

export function createApp() {
  const app = express();
  app.use(express.json());
  app.use('/clients', clientsRouter);
  app.use('/accounts', accountsRouter);
  app.use('/posts', postsRouter);
  return app;
}

if (require.main === module) {
  const { initDb } = require('./db/migrate');
  initDb();
  const app = createApp();
  app.listen(3001, () => console.log('Pascuas backend running on :3001'));
}
```

- [ ] **Step 5: Implementar rutas de clientes**

```typescript
// apps/backend/src/routes/clients.ts
import { Router } from 'express';
import { getDb } from '../db/migrate';
import { v4 as uuidv4 } from 'uuid';

export const clientsRouter = Router();

clientsRouter.get('/', (req, res) => {
  const clients = getDb().prepare('SELECT * FROM clients ORDER BY created_at DESC').all();
  res.json(clients);
});

clientsRouter.post('/', (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'name is required' });
  const id = uuidv4();
  getDb().prepare('INSERT INTO clients (id, name) VALUES (?, ?)').run(id, name);
  res.status(201).json({ id, name });
});

clientsRouter.delete('/:id', (req, res) => {
  getDb().prepare('DELETE FROM clients WHERE id = ?').run(req.params.id);
  res.status(204).send();
});
```

- [ ] **Step 6: Implementar rutas de accounts**

```typescript
// apps/backend/src/routes/accounts.ts
import { Router } from 'express';
import { getDb } from '../db/migrate';
import { encrypt } from '../../../packages/vault/src';
import { v4 as uuidv4 } from 'uuid';

export const accountsRouter = Router();
const MASTER_KEY = process.env.VAULT_MASTER_KEY ?? 'change-me-in-production!!!!!!!!';

accountsRouter.get('/', (req, res) => {
  const accounts = getDb().prepare(
    'SELECT id, client_id, platform, username, session_path, created_at FROM accounts'
  ).all(); // credentials_enc NUNCA se devuelve al cliente
  res.json(accounts);
});

accountsRouter.post('/', (req, res) => {
  const { client_id, platform, username, password } = req.body;
  if (!client_id || !platform || !username || !password)
    return res.status(400).json({ error: 'client_id, platform, username, password required' });

  const id = uuidv4();
  const credentials_enc = encrypt(JSON.stringify({ username, password }), MASTER_KEY);
  const session_path = `./sessions/${id}`;

  getDb().prepare(
    'INSERT INTO accounts (id, client_id, platform, username, credentials_enc, session_path) VALUES (?,?,?,?,?,?)'
  ).run(id, client_id, platform, username, credentials_enc, session_path);

  res.status(201).json({ id, client_id, platform, username, session_path });
});
```

- [ ] **Step 7: Implementar rutas de posts**

```typescript
// apps/backend/src/routes/posts.ts
import { Router } from 'express';
import { getDb } from '../db/migrate';
import { v4 as uuidv4 } from 'uuid';

export const postsRouter = Router();

postsRouter.get('/', (req, res) => {
  const posts = getDb().prepare('SELECT * FROM posts ORDER BY scheduled_at ASC').all();
  res.json(posts);
});

postsRouter.post('/', (req, res) => {
  const { account_id, media_path, caption, scheduled_at } = req.body;
  if (!account_id || !media_path || !scheduled_at)
    return res.status(400).json({ error: 'account_id, media_path, scheduled_at required' });

  const scheduledDate = new Date(scheduled_at);
  if (scheduledDate.getTime() <= Date.now())
    return res.status(400).json({ error: 'scheduled_at must be in the future' });

  const id = uuidv4();
  getDb().prepare(
    'INSERT INTO posts (id, account_id, media_path, caption, scheduled_at) VALUES (?,?,?,?,?)'
  ).run(id, account_id, media_path, caption ?? '', Math.floor(scheduledDate.getTime() / 1000));

  res.status(201).json({ id, account_id, media_path, scheduled_at });
});

postsRouter.delete('/:id', (req, res) => {
  getDb().prepare('DELETE FROM posts WHERE id = ?').run(req.params.id);
  res.status(204).send();
});
```

- [ ] **Step 8: Ejecutar tests — deben pasar**

```bash
cd apps/backend && npx jest src/__tests__/api.test.ts
# Expected: PASS (3 tests)
```

- [ ] **Step 9: Commit**

```bash
git add apps/backend/src/
git commit -m "feat: express REST API for clients, accounts, posts"
```

---

## Task 8: App de Escritorio con Electron

**Files:**
- Create: `apps/desktop/src/main.ts` (proceso principal Electron)
- Create: `apps/desktop/src/preload.ts`
- Create: `apps/desktop/src/renderer/App.tsx` (UI React)
- Create: `apps/desktop/package.json`

- [ ] **Step 1: Instalar Electron + React**

```bash
cd apps/desktop
npm init -y
npm install electron react react-dom
npm install -D typescript @types/react @types/react-dom electron-builder vite @vitejs/plugin-react
```

- [ ] **Step 2: Configurar `main.ts` (proceso principal)**

```typescript
// apps/desktop/src/main.ts
import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'path';

let win: BrowserWindow;

function createWindow() {
  win = new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  const isDev = !app.isPackaged;
  if (isDev) {
    win.loadURL('http://localhost:5173'); // Vite dev server
  } else {
    win.loadFile(path.join(__dirname, '../renderer/index.html'));
  }
}

app.whenReady().then(createWindow);
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });

// Proxy IPC → backend API
ipcMain.handle('api-call', async (_, { method, url, body }) => {
  const res = await fetch(`http://localhost:3001${url}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: res.status, data: await res.json() };
});
```

- [ ] **Step 3: Configurar preload.ts**

```typescript
// apps/desktop/src/preload.ts
import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('pascuas', {
  api: (method: string, url: string, body?: object) =>
    ipcRenderer.invoke('api-call', { method, url, body }),
});
```

- [ ] **Step 4: Implementar UI principal en React**

```tsx
// apps/desktop/src/renderer/App.tsx
import { useState, useEffect } from 'react';

declare global {
  interface Window {
    pascuas: {
      api: (method: string, url: string, body?: object) => Promise<{ status: number; data: any }>;
    };
  }
}

interface Client { id: string; name: string; }
interface Post { id: string; account_id: string; media_path: string; scheduled_at: number; status: string; }

export default function App() {
  const [clients, setClients] = useState<Client[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [tab, setTab] = useState<'dashboard' | 'clients' | 'schedule'>('dashboard');

  useEffect(() => {
    window.pascuas.api('GET', '/clients').then(r => setClients(r.data));
    window.pascuas.api('GET', '/posts').then(r => setPosts(r.data));
  }, []);

  return (
    <div style={{ fontFamily: 'sans-serif', display: 'flex', height: '100vh' }}>
      {/* Sidebar */}
      <nav style={{ width: 200, background: '#1a1a2e', color: '#fff', padding: 24 }}>
        <h2 style={{ color: '#e94560', marginBottom: 32 }}>🌸 Pascuas</h2>
        {(['dashboard', 'clients', 'schedule'] as const).map(t => (
          <div key={t} onClick={() => setTab(t)}
            style={{ padding: '10px 0', cursor: 'pointer', opacity: tab === t ? 1 : 0.6, textTransform: 'capitalize' }}>
            {t}
          </div>
        ))}
      </nav>

      {/* Contenido */}
      <main style={{ flex: 1, padding: 32, overflowY: 'auto' }}>
        {tab === 'dashboard' && (
          <div>
            <h1>Dashboard</h1>
            <div style={{ display: 'flex', gap: 24, marginTop: 24 }}>
              <StatCard label="Clientes" value={clients.length} />
              <StatCard label="Posts Pendientes" value={posts.filter(p => p.status === 'pending').length} />
              <StatCard label="Publicados Hoy" value={posts.filter(p => p.status === 'done').length} />
            </div>
          </div>
        )}
        {tab === 'clients' && <ClientsPanel clients={clients} onRefresh={() =>
          window.pascuas.api('GET', '/clients').then(r => setClients(r.data))} />}
        {tab === 'schedule' && <SchedulePanel posts={posts} />}
      </main>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div style={{ background: '#f0f4ff', borderRadius: 12, padding: '24px 32px', minWidth: 140 }}>
      <div style={{ fontSize: 36, fontWeight: 'bold', color: '#e94560' }}>{value}</div>
      <div style={{ color: '#666', marginTop: 4 }}>{label}</div>
    </div>
  );
}

function ClientsPanel({ clients, onRefresh }: { clients: Client[]; onRefresh: () => void }) {
  const [name, setName] = useState('');
  const add = async () => {
    if (!name.trim()) return;
    await window.pascuas.api('POST', '/clients', { name });
    setName('');
    onRefresh();
  };
  return (
    <div>
      <h1>Clientes ({clients.length})</h1>
      <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
        <input value={name} onChange={e => setName(e.target.value)}
          placeholder="Nombre del cliente" style={{ padding: 8, borderRadius: 6, border: '1px solid #ddd', flex: 1 }} />
        <button onClick={add} style={{ padding: '8px 20px', background: '#e94560', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' }}>
          + Agregar
        </button>
      </div>
      {clients.map(c => (
        <div key={c.id} style={{ padding: 16, background: '#f9f9f9', borderRadius: 8, marginBottom: 8 }}>
          {c.name}
        </div>
      ))}
    </div>
  );
}

function SchedulePanel({ posts }: { posts: Post[] }) {
  return (
    <div>
      <h1>Posts Programados</h1>
      {posts.length === 0 && <p style={{ color: '#999' }}>No hay posts programados aún.</p>}
      {posts.map(p => (
        <div key={p.id} style={{ padding: 16, background: '#f9f9f9', borderRadius: 8, marginBottom: 8, display: 'flex', justifyContent: 'space-between' }}>
          <span>{p.media_path}</span>
          <span style={{ color: p.status === 'done' ? 'green' : p.status === 'failed' ? 'red' : '#f5a623' }}>
            {p.status}
          </span>
          <span style={{ color: '#999', fontSize: 12 }}>{new Date(p.scheduled_at * 1000).toLocaleString()}</span>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 5: Configurar vite para renderer**

```typescript
// apps/desktop/vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  root: 'src/renderer',
  build: { outDir: '../../dist/renderer' },
});
```

- [ ] **Step 6: Agregar scripts en package.json**

```json
{
  "scripts": {
    "dev:renderer": "vite",
    "dev:main": "tsc -w",
    "dev": "concurrently \"npm run dev:renderer\" \"npm run dev:main\" \"electron .\"",
    "build": "vite build && tsc && electron-builder"
  }
}
```

- [ ] **Step 7: Correr en modo dev para verificar visualmente**

```bash
# Terminal 1 — backend
cd apps/backend && npx ts-node src/server.ts

# Terminal 2 — desktop
cd apps/desktop && npm run dev
```
Expected: ventana Electron con sidebar morado/rosa, dashboard con 3 tarjetas de estadísticas.

- [ ] **Step 8: Commit**

```bash
git add apps/desktop/
git commit -m "feat: electron desktop app with react ui, dashboard, clients, schedule tabs"
```

---

## Task 9: App Móvil con React Native

**Files:**
- Create: `apps/mobile/App.tsx`
- Create: `apps/mobile/src/screens/DashboardScreen.tsx`
- Create: `apps/mobile/src/screens/ClientsScreen.tsx`
- Create: `apps/mobile/src/api/client.ts`

- [ ] **Step 1: Inicializar proyecto React Native**

```bash
cd apps/mobile
npx react-native@latest init PascuasMobile --template react-native-template-typescript
```

- [ ] **Step 2: Implementar cliente API compartido**

```typescript
// apps/mobile/src/api/client.ts
const BASE_URL = __DEV__ ? 'http://10.0.2.2:3001' : 'https://api.pascuas.app'; // 10.0.2.2 = localhost desde emulador Android

export async function apiCall<T>(method: string, path: string, body?: object): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(`API error ${res.status}`);
  return res.json();
}
```

- [ ] **Step 3: Implementar DashboardScreen**

```tsx
// apps/mobile/src/screens/DashboardScreen.tsx
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { apiCall } from '../api/client';

export function DashboardScreen() {
  const [stats, setStats] = useState({ clients: 0, pending: 0, done: 0 });

  useEffect(() => {
    Promise.all([
      apiCall<any[]>('GET', '/clients'),
      apiCall<any[]>('GET', '/posts'),
    ]).then(([clients, posts]) => {
      setStats({
        clients: clients.length,
        pending: posts.filter(p => p.status === 'pending').length,
        done: posts.filter(p => p.status === 'done').length,
      });
    });
  }, []);

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>🌸 Pascuas</Text>
      <View style={styles.cards}>
        <StatCard label="Clientes" value={stats.clients} />
        <StatCard label="Pendientes" value={stats.pending} />
        <StatCard label="Publicados" value={stats.done} />
      </View>
    </ScrollView>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.card}>
      <Text style={styles.cardValue}>{value}</Text>
      <Text style={styles.cardLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', padding: 24 },
  title: { fontSize: 28, fontWeight: 'bold', color: '#e94560', marginBottom: 24 },
  cards: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
  card: { backgroundColor: '#f0f4ff', borderRadius: 12, padding: 20, minWidth: 100, alignItems: 'center' },
  cardValue: { fontSize: 32, fontWeight: 'bold', color: '#e94560' },
  cardLabel: { fontSize: 12, color: '#666', marginTop: 4 },
});
```

- [ ] **Step 4: Correr en emulador para verificar**

```bash
cd apps/mobile
npx react-native run-android   # o run-ios
```
Expected: pantalla con título "🌸 Pascuas" y 3 tarjetas de estadísticas.

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/
git commit -m "feat: react native mobile app with dashboard screen"
```

---

## Task 10: Integración Final — Worker de Publicación Completo

**Files:**
- Modify: `apps/backend/src/server.ts`
- Create: `apps/backend/src/publisher.ts`

- [ ] **Step 1: Implementar publisher que conecta todo**

```typescript
// apps/backend/src/publisher.ts
import { Scheduler } from '../../packages/scheduler/src';
import { InstagramClient } from '../../packages/api-clients/src/instagram';
import { TikTokClient } from '../../packages/api-clients/src/tiktok';
import { FacebookClient } from '../../packages/api-clients/src/facebook';
import { decrypt } from '../../packages/vault/src';
import { getDb } from './db/migrate';

const MASTER_KEY = process.env.VAULT_MASTER_KEY ?? 'change-me-in-production!!!!!!!!';
const REDIS_URL = process.env.REDIS_URL ?? 'redis://localhost:6379';

export function startPublisher() {
  const scheduler = new Scheduler(REDIS_URL);

  scheduler.startWorker(async (job) => {
    const { postId, accountId, platform } = job.data;
    const db = getDb();

    // 1. Obtener post y cuenta
    const post = db.prepare('SELECT * FROM posts WHERE id = ?').get(postId) as any;
    const account = db.prepare('SELECT * FROM accounts WHERE id = ?').get(accountId) as any;
    if (!post || !account) throw new Error(`Post o cuenta no encontrada: ${postId} / ${accountId}`);

    // 2. Descifrar credenciales
    const creds = JSON.parse(decrypt(account.credentials_enc, MASTER_KEY));

    // 3. Marcar como publicando
    db.prepare("UPDATE posts SET status = 'publishing' WHERE id = ?").run(postId);

    try {
      if (platform === 'instagram') {
        const client = new InstagramClient({ accessToken: creds.access_token, igUserId: creds.ig_user_id });
        await client.uploadReel({ videoUrl: post.media_path, caption: post.caption });
      } else if (platform === 'tiktok') {
        const client = new TikTokClient({ accessToken: creds.access_token });
        await client.uploadVideo({ videoUrl: post.media_path, title: post.caption });
      } else if (platform === 'facebook') {
        const client = new FacebookClient({ accessToken: creds.access_token, pageId: creds.page_id });
        await client.uploadReel({ videoUrl: post.media_path, description: post.caption });
      }
      db.prepare("UPDATE posts SET status = 'done' WHERE id = ?").run(postId);
    } catch (err: any) {
      db.prepare("UPDATE posts SET status = 'failed', error_msg = ? WHERE id = ?").run(err.message, postId);
      throw err; // Bull reintentará según la config de backoff
    }
  });

  console.log('[publisher] Worker iniciado y escuchando jobs...');
  return scheduler;
}
```

- [ ] **Step 2: Conectar publisher al arranque del servidor**

```typescript
// Agregar al final de apps/backend/src/server.ts (en el bloque if require.main)
if (require.main === module) {
  const { initDb } = require('./db/migrate');
  const { startPublisher } = require('./publisher');
  initDb();
  startPublisher();
  const app = createApp();
  app.listen(3001, () => console.log('Pascuas backend running on :3001'));
}
```

- [ ] **Step 3: Agregar endpoint para programar un post en la API**

Agregar al final de `apps/backend/src/routes/posts.ts`:

```typescript
// POST /posts/:id/schedule — encola el job en Bull
postsRouter.post('/:id/schedule', async (req, res) => {
  const post = getDb().prepare('SELECT * FROM posts WHERE id = ?').get(req.params.id) as any;
  if (!post) return res.status(404).json({ error: 'Post not found' });
  const account = getDb().prepare('SELECT * FROM accounts WHERE id = ?').get(post.account_id) as any;

  const { Scheduler } = require('../../../packages/scheduler/src');
  const scheduler = new Scheduler(process.env.REDIS_URL ?? 'redis://localhost:6379');
  const jobId = await scheduler.schedulePost({
    postId: post.id,
    accountId: post.account_id,
    platform: account.platform,
    scheduledAt: new Date(post.scheduled_at * 1000),
  });
  res.json({ jobId });
});
```

- [ ] **Step 4: Smoke test de integración manual**

```bash
# 1. Levantar Redis
docker run -d -p 6379:6379 redis:alpine

# 2. Levantar backend
cd apps/backend && VAULT_MASTER_KEY=my-secret-key-32chars npx ts-node src/server.ts

# 3. Crear cliente, cuenta y post via curl
curl -X POST localhost:3001/clients -H "Content-Type: application/json" -d '{"name":"Test Agency"}'
# Copiar el id retornado como CLIENT_ID

curl -X POST localhost:3001/accounts -H "Content-Type: application/json" \
  -d '{"client_id":"CLIENT_ID","platform":"instagram","username":"@test","password":"pass123"}'

curl -X POST localhost:3001/posts -H "Content-Type: application/json" \
  -d '{"account_id":"ACCOUNT_ID","media_path":"https://example.com/video.mp4","scheduled_at":"2026-12-01T10:00:00Z"}'

# 4. Programar el post
curl -X POST localhost:3001/posts/POST_ID/schedule
# Expected: {"jobId": "1"}
```

- [ ] **Step 5: Commit final**

```bash
git add .
git commit -m "feat: full publisher worker connecting scheduler, vault, api clients and db"
```

---

## Self-Review

### Cobertura de spec

| Requisito | Tarea |
|-----------|-------|
| Múltiples cuentas sin bloqueos de IP/sesión | Task 4 — SessionManager con perfiles Playwright aislados |
| Costos operativos bajos (sin SaaS externo) | Toda la arquitectura es self-hosted |
| Seguridad de credenciales | Task 3 — Vault AES-256-GCM |
| Programación puntual de posts | Task 6 — Scheduler con Bull + Task 10 |
| Instagram Reels | Task 5 — InstagramClient |
| TikTok videos | Task 5 — TikTokClient |
| Facebook Reels | Task 5 — FacebookClient |
| App escritorio (Windows/macOS/Linux) | Task 8 — Electron |
| App móvil (iOS/Android/iPad) | Task 9 — React Native |
| Dashboard con métricas básicas | Task 8 Step 4 — StatCards en UI |

### Gaps identificados y resueltos
- OAuth flow por cuenta (obtención de `access_token`): requiere una tarea futura post-MVP — el CM deberá autenticar cada cuenta manualmente la primera vez desde la app (pantalla de login embebida via Playwright).
- Subida de archivos de video local → CDN: el MVP asume URLs públicas. Upload desde disco es tarea post-MVP.

### Notas de producción (post-MVP)
- Reemplazar SQLite por PostgreSQL editando `apps/backend/src/db/migrate.ts`
- Agregar variables de entorno para `VAULT_MASTER_KEY` y `REDIS_URL` con un `.env` real
- Configurar proxies por cuenta en `SessionManager` para IPs dedicadas
