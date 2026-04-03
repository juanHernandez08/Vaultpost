# Juppao Desktop App — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convertir el proyecto Pascuas en la app de escritorio Juppao: Electron + React con MongoDB, soporte completo de Posts y Stories (crear/editar/eliminar/programar), métricas por cuenta, y código organizado en carpetas con responsabilidades claras.

**Architecture:** El backend se embebe directamente en el proceso main de Electron usando IPC (sin servidor HTTP separado). MongoDB via Mongoose reemplaza SQLite. Los paquetes separados (vault, scheduler, api-clients) se fusionan en `src/main/services/` y `src/main/api-clients/` dentro de la app desktop.

**Tech Stack:** Electron 31, React 18, TypeScript, Mongoose 8, Bull + Redis (scheduler), AES-256-GCM (vault), Vite 5, electron-builder

---

## MongoDB — Análisis de Migración

**¿Es posible?** Sí. Dos opciones:
1. **MongoDB Atlas (recomendada):** Connection string en settings de la app. Sin instalación local. Requiere internet.
2. **MongoDB local:** Requiere que el usuario tenga `mongod` instalado y corriendo.

**Decisión del plan:** Usamos Mongoose con connection string configurable vía variable de entorno `MONGODB_URI`. Por defecto apunta a `mongodb://localhost:27017/juppao`. El usuario puede cambiarla a Atlas en `.env`.

---

## Nueva Estructura de Archivos

```
juppao/                              (renombrar raíz)
├── apps/
│   └── desktop/
│       ├── src/
│       │   ├── main/
│       │   │   ├── index.ts                  # Entry point Electron
│       │   │   ├── db/
│       │   │   │   ├── connection.ts         # Mongoose connect/disconnect
│       │   │   │   └── models/
│       │   │   │       ├── Client.ts
│       │   │   │       ├── Account.ts
│       │   │   │       ├── Post.ts
│       │   │   │       ├── Story.ts
│       │   │   │       └── Metric.ts
│       │   │   ├── ipc/
│       │   │   │   ├── register.ts           # Registra todos los handlers
│       │   │   │   ├── clients.ts
│       │   │   │   ├── accounts.ts
│       │   │   │   ├── posts.ts
│       │   │   │   ├── stories.ts
│       │   │   │   └── metrics.ts
│       │   │   ├── services/
│       │   │   │   ├── vault.ts              # AES-256-GCM
│       │   │   │   ├── scheduler.ts          # Bull queue
│       │   │   │   └── publisher.ts          # Worker posts+stories
│       │   │   └── api-clients/
│       │   │       ├── instagram.ts
│       │   │       ├── tiktok.ts
│       │   │       └── facebook.ts
│       │   ├── preload/
│       │   │   └── index.ts                  # contextBridge → window.juppao
│       │   └── renderer/
│       │       ├── index.html
│       │       ├── main.tsx
│       │       ├── App.tsx                   # Layout shell + router
│       │       ├── components/
│       │       │   ├── Sidebar.tsx
│       │       │   ├── TopBar.tsx
│       │       │   ├── Modal.tsx
│       │       │   ├── Toast.tsx
│       │       │   ├── StatCard.tsx
│       │       │   └── Badge.tsx
│       │       ├── pages/
│       │       │   ├── Dashboard.tsx
│       │       │   ├── Clients.tsx
│       │       │   ├── Accounts.tsx
│       │       │   ├── Posts.tsx
│       │       │   ├── Stories.tsx
│       │       │   ├── Schedule.tsx
│       │       │   └── Metrics.tsx
│       │       ├── hooks/
│       │       │   ├── useIpc.ts
│       │       │   └── useToast.ts
│       │       └── styles/
│       │           └── globals.css
│       ├── package.json
│       ├── tsconfig.json
│       ├── tsconfig.main.json
│       └── vite.config.ts
├── package.json
├── .env.example
└── turbo.json
```

**Archivos a eliminar:**
- `apps/backend/` (completo)
- `apps/mobile/` (completo)
- `apps/desktop-ui/` (completo)
- `packages/vault/`, `packages/scheduler/`, `packages/api-clients/` (su código se mueve a `apps/desktop/src/main/`)

---

## Task 1: Limpiar y renombrar el proyecto

**Files:**
- Modify: `package.json` (raíz)
- Delete: `apps/backend/`, `apps/mobile/`, `apps/desktop-ui/`, `packages/`

- [ ] **Step 1: Actualizar package.json raíz**

```json
{
  "name": "juppao",
  "version": "0.1.0",
  "private": true,
  "workspaces": ["apps/desktop"],
  "scripts": {
    "dev": "turbo run dev",
    "build": "turbo run build",
    "test": "turbo run test"
  },
  "devDependencies": {
    "turbo": "^2.0.0",
    "typescript": "^5.4.0"
  }
}
```

- [ ] **Step 2: Eliminar directorios obsoletos**

```bash
rm -rf apps/backend apps/mobile apps/desktop-ui packages
```

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "chore: rename to juppao, remove backend/mobile/ui apps and packages"
```

---

## Task 2: Actualizar package.json del desktop

**Files:**
- Modify: `apps/desktop/package.json`

- [ ] **Step 1: Reemplazar package.json con dependencias completas**

```json
{
  "name": "@juppao/desktop",
  "version": "0.1.0",
  "private": true,
  "main": "dist/main/index.js",
  "scripts": {
    "dev": "concurrently \"npm run dev:main\" \"npm run dev:renderer\"",
    "dev:main": "tsc -p tsconfig.main.json --watch",
    "dev:renderer": "vite",
    "build": "tsc -p tsconfig.main.json && vite build",
    "start": "electron .",
    "test": "jest --passWithNoTests"
  },
  "dependencies": {
    "bull": "^4.12.2",
    "dotenv": "^16.4.5",
    "ioredis": "^5.3.2",
    "mongoose": "^8.4.0",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "uuid": "^9.0.1"
  },
  "devDependencies": {
    "@types/bull": "^4.10.4",
    "@types/node": "^20.12.0",
    "@types/react": "^18.3.3",
    "@types/react-dom": "^18.3.0",
    "@types/uuid": "^9.0.8",
    "@vitejs/plugin-react": "^4.3.0",
    "concurrently": "^8.2.2",
    "electron": "^31.0.0",
    "electron-builder": "^24.13.3",
    "typescript": "^5.4.5",
    "vite": "^5.3.1"
  }
}
```

- [ ] **Step 2: Crear tsconfig.main.json (proceso main, CommonJS)**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "commonjs",
    "lib": ["ES2022"],
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "outDir": "dist/main",
    "rootDir": "src/main",
    "sourceMap": true
  },
  "include": ["src/main/**/*", "src/preload/**/*"]
}
```

- [ ] **Step 3: Actualizar tsconfig.json (renderer, ESM/DOM)**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "jsx": "react-jsx",
    "outDir": "dist/renderer",
    "rootDir": "src/renderer",
    "noEmit": true
  },
  "include": ["src/renderer/**/*"]
}
```

- [ ] **Step 4: Crear vite.config.ts**

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  root: 'src/renderer',
  base: './',
  build: {
    outDir: path.resolve(__dirname, 'dist/renderer'),
    emptyOutDir: true,
  },
  server: { port: 5173 },
});
```

- [ ] **Step 5: Instalar dependencias**

```bash
cd apps/desktop && npm install
```

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "chore: update desktop package.json with mongoose, electron-builder, concurrently"
```

---

## Task 3: MongoDB connection y modelos

**Files:**
- Create: `apps/desktop/src/main/db/connection.ts`
- Create: `apps/desktop/src/main/db/models/Client.ts`
- Create: `apps/desktop/src/main/db/models/Account.ts`
- Create: `apps/desktop/src/main/db/models/Post.ts`
- Create: `apps/desktop/src/main/db/models/Story.ts`
- Create: `apps/desktop/src/main/db/models/Metric.ts`

- [ ] **Step 1: Crear connection.ts**

```typescript
// apps/desktop/src/main/db/connection.ts
import mongoose from 'mongoose';

let connected = false;

export async function connectDb(uri: string): Promise<void> {
  if (connected) return;
  await mongoose.connect(uri, { dbName: 'juppao' });
  connected = true;
  console.log('[db] MongoDB connected:', uri);
}

export async function disconnectDb(): Promise<void> {
  await mongoose.disconnect();
  connected = false;
}
```

- [ ] **Step 2: Crear Client.ts**

```typescript
// apps/desktop/src/main/db/models/Client.ts
import { Schema, model, Document } from 'mongoose';

export interface IClient extends Document {
  name: string;
  createdAt: Date;
}

const ClientSchema = new Schema<IClient>(
  { name: { type: String, required: true, trim: true } },
  { timestamps: true }
);

export const Client = model<IClient>('Client', ClientSchema);
```

- [ ] **Step 3: Crear Account.ts**

```typescript
// apps/desktop/src/main/db/models/Account.ts
import { Schema, model, Document, Types } from 'mongoose';

export type Platform = 'instagram' | 'tiktok' | 'facebook';

export interface IAccount extends Document {
  clientId: Types.ObjectId;
  platform: Platform;
  username: string;
  credentialsEnc: string;   // AES-256-GCM encrypted JSON
  createdAt: Date;
}

const AccountSchema = new Schema<IAccount>(
  {
    clientId:       { type: Schema.Types.ObjectId, ref: 'Client', required: true },
    platform:       { type: String, enum: ['instagram','tiktok','facebook'], required: true },
    username:       { type: String, required: true, trim: true },
    credentialsEnc: { type: String, required: true },
  },
  { timestamps: true }
);

export const Account = model<IAccount>('Account', AccountSchema);
```

- [ ] **Step 4: Crear Post.ts**

```typescript
// apps/desktop/src/main/db/models/Post.ts
import { Schema, model, Document, Types } from 'mongoose';

export type PostStatus = 'pending' | 'publishing' | 'done' | 'failed';

export interface IPost extends Document {
  accountId: Types.ObjectId;
  mediaPath: string;
  caption: string;
  scheduledAt: Date;
  status: PostStatus;
  errorMsg?: string;
  platformPostId?: string;   // ID devuelto por la red social al publicar
  createdAt: Date;
}

const PostSchema = new Schema<IPost>(
  {
    accountId:      { type: Schema.Types.ObjectId, ref: 'Account', required: true },
    mediaPath:      { type: String, required: true },
    caption:        { type: String, default: '' },
    scheduledAt:    { type: Date, required: true },
    status:         { type: String, enum: ['pending','publishing','done','failed'], default: 'pending' },
    errorMsg:       { type: String },
    platformPostId: { type: String },
  },
  { timestamps: true }
);

export const Post = model<IPost>('Post', PostSchema);
```

- [ ] **Step 5: Crear Story.ts**

```typescript
// apps/desktop/src/main/db/models/Story.ts
import { Schema, model, Document, Types } from 'mongoose';

export type StoryStatus = 'pending' | 'publishing' | 'done' | 'failed';
export type StoryMediaType = 'image' | 'video';

export interface IStory extends Document {
  accountId: Types.ObjectId;
  mediaPath: string;
  mediaType: StoryMediaType;
  caption?: string;          // Solo para FB/IG
  scheduledAt: Date;
  status: StoryStatus;
  errorMsg?: string;
  platformStoryId?: string;
  createdAt: Date;
}

const StorySchema = new Schema<IStory>(
  {
    accountId:       { type: Schema.Types.ObjectId, ref: 'Account', required: true },
    mediaPath:       { type: String, required: true },
    mediaType:       { type: String, enum: ['image','video'], required: true },
    caption:         { type: String },
    scheduledAt:     { type: Date, required: true },
    status:          { type: String, enum: ['pending','publishing','done','failed'], default: 'pending' },
    errorMsg:        { type: String },
    platformStoryId: { type: String },
  },
  { timestamps: true }
);

export const Story = model<IStory>('Story', StorySchema);
```

- [ ] **Step 6: Crear Metric.ts**

```typescript
// apps/desktop/src/main/db/models/Metric.ts
import { Schema, model, Document, Types } from 'mongoose';

export interface IMetric extends Document {
  accountId: Types.ObjectId;
  fetchedAt: Date;
  followers: number;
  reach: number;            // Alcance últimas 24h
  impressions: number;      // Impresiones últimas 24h
  profileViews: number;
  postsCount: number;
  raw: Record<string, unknown>;  // Respuesta completa de la API
}

const MetricSchema = new Schema<IMetric>(
  {
    accountId:    { type: Schema.Types.ObjectId, ref: 'Account', required: true },
    fetchedAt:    { type: Date, required: true },
    followers:    { type: Number, default: 0 },
    reach:        { type: Number, default: 0 },
    impressions:  { type: Number, default: 0 },
    profileViews: { type: Number, default: 0 },
    postsCount:   { type: Number, default: 0 },
    raw:          { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: false }
);

export const Metric = model<IMetric>('Metric', MetricSchema);
```

- [ ] **Step 7: Commit**

```bash
git add apps/desktop/src/main/db
git commit -m "feat: add mongoose connection and models (Client, Account, Post, Story, Metric)"
```

---

## Task 4: Vault service (cifrado AES-256-GCM)

**Files:**
- Create: `apps/desktop/src/main/services/vault.ts`

- [ ] **Step 1: Crear vault.ts**

```typescript
// apps/desktop/src/main/services/vault.ts
import { createCipheriv, createDecipheriv, randomBytes, createHash } from 'crypto';

function deriveKey(masterKey: string): Buffer {
  return createHash('sha256').update(masterKey).digest();
}

export function encrypt(plaintext: string, masterKey: string): string {
  const key = deriveKey(masterKey);
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
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

- [ ] **Step 2: Commit**

```bash
git add apps/desktop/src/main/services/vault.ts
git commit -m "feat: add vault service (AES-256-GCM encrypt/decrypt)"
```

---

## Task 5: API Clients (Instagram, TikTok, Facebook)

**Files:**
- Create: `apps/desktop/src/main/api-clients/instagram.ts`
- Create: `apps/desktop/src/main/api-clients/tiktok.ts`
- Create: `apps/desktop/src/main/api-clients/facebook.ts`
- Create: `apps/desktop/src/main/api-clients/index.ts`

- [ ] **Step 1: Crear instagram.ts**

```typescript
// apps/desktop/src/main/api-clients/instagram.ts
const BASE = 'https://graph.facebook.com/v19.0';

export interface IgCredentials { accessToken: string; igUserId: string; }

export class InstagramClient {
  constructor(private creds: IgCredentials) {}

  async uploadReel(videoUrl: string, caption = ''): Promise<string> {
    const containerRes = await fetch(`${BASE}/${this.creds.igUserId}/media`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ media_type: 'REELS', video_url: videoUrl, caption, access_token: this.creds.accessToken }),
    });
    if (!containerRes.ok) throw new Error(`IG container: ${await containerRes.text()}`);
    const { id: creationId } = await containerRes.json() as { id: string };

    const publishRes = await fetch(`${BASE}/${this.creds.igUserId}/media_publish`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ creation_id: creationId, access_token: this.creds.accessToken }),
    });
    if (!publishRes.ok) throw new Error(`IG publish: ${await publishRes.text()}`);
    const { id } = await publishRes.json() as { id: string };
    return id;
  }

  async uploadStory(mediaUrl: string, mediaType: 'image' | 'video'): Promise<string> {
    const igMediaType = mediaType === 'video' ? 'VIDEO' : 'IMAGE';
    const mediaKey = mediaType === 'video' ? 'video_url' : 'image_url';
    const containerRes = await fetch(`${BASE}/${this.creds.igUserId}/media`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ media_type: igMediaType, [mediaKey]: mediaUrl, is_stories: true, access_token: this.creds.accessToken }),
    });
    if (!containerRes.ok) throw new Error(`IG story container: ${await containerRes.text()}`);
    const { id: creationId } = await containerRes.json() as { id: string };

    const publishRes = await fetch(`${BASE}/${this.creds.igUserId}/media_publish`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ creation_id: creationId, access_token: this.creds.accessToken }),
    });
    if (!publishRes.ok) throw new Error(`IG story publish: ${await publishRes.text()}`);
    const { id } = await publishRes.json() as { id: string };
    return id;
  }

  async getMetrics(): Promise<Record<string, unknown>> {
    const fields = 'followers_count,media_count,profile_views,reach,impressions';
    const res = await fetch(`${BASE}/${this.creds.igUserId}?fields=${fields}&access_token=${this.creds.accessToken}`);
    if (!res.ok) throw new Error(`IG metrics: ${await res.text()}`);
    return res.json() as Promise<Record<string, unknown>>;
  }
}
```

- [ ] **Step 2: Crear tiktok.ts**

```typescript
// apps/desktop/src/main/api-clients/tiktok.ts
const BASE = 'https://open.tiktokapis.com/v2';

export interface TtCredentials { accessToken: string; openId: string; }

export class TikTokClient {
  constructor(private creds: TtCredentials) {}

  async uploadVideo(videoUrl: string, title: string): Promise<string> {
    const res = await fetch(`${BASE}/post/publish/video/init/`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${this.creds.accessToken}`, 'Content-Type': 'application/json; charset=UTF-8' },
      body: JSON.stringify({
        post_info: { title, privacy_level: 'PUBLIC_TO_EVERYONE', disable_comment: false },
        source_info: { source: 'PULL_FROM_URL', video_url: videoUrl },
      }),
    });
    if (!res.ok) throw new Error(`TT upload: ${await res.text()}`);
    const data = await res.json() as { data: { publish_id: string } };
    return data.data.publish_id;
  }

  // TikTok Stories API (requiere acceso especial de la plataforma)
  async uploadStory(mediaUrl: string): Promise<string> {
    const res = await fetch(`${BASE}/post/publish/content/init/`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${this.creds.accessToken}`, 'Content-Type': 'application/json; charset=UTF-8' },
      body: JSON.stringify({
        post_info: { privacy_level: 'PUBLIC_TO_EVERYONE', post_type: 'STORY' },
        source_info: { source: 'PULL_FROM_URL', video_url: mediaUrl },
      }),
    });
    if (!res.ok) throw new Error(`TT story: ${await res.text()}`);
    const data = await res.json() as { data: { publish_id: string } };
    return data.data.publish_id;
  }

  async getMetrics(): Promise<Record<string, unknown>> {
    const res = await fetch(`${BASE}/user/info/?fields=follower_count,video_count,profile_deep_link`, {
      headers: { Authorization: `Bearer ${this.creds.accessToken}` },
    });
    if (!res.ok) throw new Error(`TT metrics: ${await res.text()}`);
    return res.json() as Promise<Record<string, unknown>>;
  }
}
```

- [ ] **Step 3: Crear facebook.ts**

```typescript
// apps/desktop/src/main/api-clients/facebook.ts
const BASE = 'https://graph.facebook.com/v19.0';

export interface FbCredentials { accessToken: string; pageId: string; }

export class FacebookClient {
  constructor(private creds: FbCredentials) {}

  async uploadReel(videoUrl: string, description = ''): Promise<string> {
    const res = await fetch(`${BASE}/${this.creds.pageId}/video_reels`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ upload_phase: 'finish', video_url: videoUrl, description, access_token: this.creds.accessToken, published: true }),
    });
    if (!res.ok) throw new Error(`FB reel: ${await res.text()}`);
    const { id } = await res.json() as { id: string };
    return id;
  }

  async uploadStory(mediaUrl: string, mediaType: 'image' | 'video'): Promise<string> {
    const endpoint = mediaType === 'image' ? 'photo_stories' : 'video_stories';
    const mediaKey = mediaType === 'image' ? 'url' : 'file_url';
    const res = await fetch(`${BASE}/${this.creds.pageId}/${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [mediaKey]: mediaUrl, access_token: this.creds.accessToken }),
    });
    if (!res.ok) throw new Error(`FB story: ${await res.text()}`);
    const { id } = await res.json() as { id: string };
    return id;
  }

  async getMetrics(): Promise<Record<string, unknown>> {
    const metric = 'page_fans,page_impressions_day,page_views_total,page_post_engagements';
    const res = await fetch(`${BASE}/${this.creds.pageId}/insights?metric=${metric}&period=day&access_token=${this.creds.accessToken}`);
    if (!res.ok) throw new Error(`FB metrics: ${await res.text()}`);
    return res.json() as Promise<Record<string, unknown>>;
  }
}
```

- [ ] **Step 4: Crear index.ts**

```typescript
// apps/desktop/src/main/api-clients/index.ts
export { InstagramClient } from './instagram';
export { TikTokClient } from './tiktok';
export { FacebookClient } from './facebook';
```

- [ ] **Step 5: Commit**

```bash
git add apps/desktop/src/main/api-clients
git commit -m "feat: add instagram/tiktok/facebook api clients with posts, stories, and metrics"
```

---

## Task 6: Scheduler y Publisher services

**Files:**
- Create: `apps/desktop/src/main/services/scheduler.ts`
- Create: `apps/desktop/src/main/services/publisher.ts`

- [ ] **Step 1: Crear scheduler.ts**

```typescript
// apps/desktop/src/main/services/scheduler.ts
import Queue from 'bull';

export type JobType = 'post' | 'story';

export interface PublishJobPayload {
  type: JobType;
  id: string;      // ObjectId del Post o Story
}

let queue: Queue.Queue<PublishJobPayload> | null = null;

export function getQueue(redisUrl: string): Queue.Queue<PublishJobPayload> {
  if (!queue) {
    queue = new Queue<PublishJobPayload>('juppao-publishing', redisUrl);
  }
  return queue;
}

export async function scheduleJob(
  redisUrl: string,
  payload: PublishJobPayload,
  scheduledAt: Date
): Promise<string> {
  const delay = scheduledAt.getTime() - Date.now();
  if (delay < 0) throw new Error('La fecha de publicación debe ser futura');
  const job = await getQueue(redisUrl).add(payload, {
    delay,
    attempts: 3,
    backoff: { type: 'exponential', delay: 5000 },
  });
  return String(job.id);
}
```

- [ ] **Step 2: Crear publisher.ts**

```typescript
// apps/desktop/src/main/services/publisher.ts
import { decrypt } from './vault';
import { Post } from '../db/models/Post';
import { Story } from '../db/models/Story';
import { Account } from '../db/models/Account';
import { InstagramClient } from '../api-clients/instagram';
import { TikTokClient } from '../api-clients/tiktok';
import { FacebookClient } from '../api-clients/facebook';
import { getQueue, PublishJobPayload } from './scheduler';

const MASTER_KEY = process.env.VAULT_MASTER_KEY ?? 'change-me-in-prod-32chars!!!!!!!!';

async function getClient(accountId: string) {
  const account = await Account.findById(accountId);
  if (!account) throw new Error(`Account not found: ${accountId}`);
  const creds = JSON.parse(decrypt(account.credentialsEnc, MASTER_KEY));
  switch (account.platform) {
    case 'instagram': return new InstagramClient(creds);
    case 'tiktok':    return new TikTokClient(creds);
    case 'facebook':  return new FacebookClient(creds);
    default: throw new Error(`Unknown platform: ${account.platform}`);
  }
}

export async function publishPost(postId: string): Promise<void> {
  const post = await Post.findById(postId);
  if (!post) throw new Error(`Post not found: ${postId}`);
  await Post.findByIdAndUpdate(postId, { status: 'publishing' });
  try {
    const client = await getClient(String(post.accountId));
    let platformPostId: string;
    if (client instanceof InstagramClient) {
      platformPostId = await client.uploadReel(post.mediaPath, post.caption);
    } else if (client instanceof TikTokClient) {
      platformPostId = await client.uploadVideo(post.mediaPath, post.caption);
    } else {
      platformPostId = await (client as FacebookClient).uploadReel(post.mediaPath, post.caption);
    }
    await Post.findByIdAndUpdate(postId, { status: 'done', platformPostId });
  } catch (err: any) {
    await Post.findByIdAndUpdate(postId, { status: 'failed', errorMsg: err.message });
    throw err;
  }
}

export async function publishStory(storyId: string): Promise<void> {
  const story = await Story.findById(storyId);
  if (!story) throw new Error(`Story not found: ${storyId}`);
  await Story.findByIdAndUpdate(storyId, { status: 'publishing' });
  try {
    const client = await getClient(String(story.accountId));
    let platformStoryId: string;
    if (client instanceof InstagramClient) {
      platformStoryId = await client.uploadStory(story.mediaPath, story.mediaType);
    } else if (client instanceof TikTokClient) {
      platformStoryId = await client.uploadStory(story.mediaPath);
    } else {
      platformStoryId = await (client as FacebookClient).uploadStory(story.mediaPath, story.mediaType);
    }
    await Story.findByIdAndUpdate(storyId, { status: 'done', platformStoryId });
  } catch (err: any) {
    await Story.findByIdAndUpdate(storyId, { status: 'failed', errorMsg: err.message });
    throw err;
  }
}

export function startPublisherWorker(redisUrl: string): void {
  getQueue(redisUrl).process(async (job) => {
    const { type, id } = job.data as PublishJobPayload;
    if (type === 'post')  await publishPost(id);
    if (type === 'story') await publishStory(id);
  });
  console.log('[publisher] Worker listening for jobs...');
}
```

- [ ] **Step 3: Commit**

```bash
git add apps/desktop/src/main/services
git commit -m "feat: add scheduler and publisher services (posts + stories)"
```

---

## Task 7: IPC Handlers

**Files:**
- Create: `apps/desktop/src/main/ipc/clients.ts`
- Create: `apps/desktop/src/main/ipc/accounts.ts`
- Create: `apps/desktop/src/main/ipc/posts.ts`
- Create: `apps/desktop/src/main/ipc/stories.ts`
- Create: `apps/desktop/src/main/ipc/metrics.ts`
- Create: `apps/desktop/src/main/ipc/register.ts`

- [ ] **Step 1: Crear ipc/clients.ts**

```typescript
// apps/desktop/src/main/ipc/clients.ts
import { ipcMain } from 'electron';
import { Client } from '../db/models/Client';

export function registerClientHandlers(): void {
  ipcMain.handle('clients:list', async () => {
    return Client.find().sort({ createdAt: -1 }).lean();
  });

  ipcMain.handle('clients:create', async (_e, { name }: { name: string }) => {
    if (!name?.trim()) throw new Error('name is required');
    const client = await Client.create({ name: name.trim() });
    return client.toObject();
  });

  ipcMain.handle('clients:delete', async (_e, { id }: { id: string }) => {
    await Client.findByIdAndDelete(id);
    return { ok: true };
  });
}
```

- [ ] **Step 2: Crear ipc/accounts.ts**

```typescript
// apps/desktop/src/main/ipc/accounts.ts
import { ipcMain } from 'electron';
import { Account } from '../db/models/Account';
import { encrypt } from '../services/vault';

const MASTER_KEY = process.env.VAULT_MASTER_KEY ?? 'change-me-in-prod-32chars!!!!!!!!';

export function registerAccountHandlers(): void {
  ipcMain.handle('accounts:list', async () => {
    return Account.find().sort({ createdAt: -1 }).populate('clientId', 'name').lean();
  });

  ipcMain.handle('accounts:create', async (_e, payload: {
    clientId: string; platform: string; username: string;
    accessToken: string; igUserId?: string; pageId?: string; openId?: string;
  }) => {
    const { clientId, platform, username, ...credFields } = payload;
    if (!clientId || !platform || !username) throw new Error('clientId, platform, username required');
    const credentialsEnc = encrypt(JSON.stringify(credFields), MASTER_KEY);
    const account = await Account.create({ clientId, platform, username, credentialsEnc });
    return account.toObject();
  });

  ipcMain.handle('accounts:delete', async (_e, { id }: { id: string }) => {
    await Account.findByIdAndDelete(id);
    return { ok: true };
  });
}
```

- [ ] **Step 3: Crear ipc/posts.ts**

```typescript
// apps/desktop/src/main/ipc/posts.ts
import { ipcMain } from 'electron';
import { Post } from '../db/models/Post';
import { scheduleJob } from '../services/scheduler';

const REDIS_URL = process.env.REDIS_URL ?? 'redis://localhost:6379';

export function registerPostHandlers(): void {
  ipcMain.handle('posts:list', async () => {
    return Post.find().sort({ scheduledAt: 1 }).lean();
  });

  ipcMain.handle('posts:create', async (_e, payload: {
    accountId: string; mediaPath: string; caption?: string; scheduledAt: string;
  }) => {
    const { accountId, mediaPath, caption = '', scheduledAt } = payload;
    if (!accountId || !mediaPath || !scheduledAt) throw new Error('accountId, mediaPath, scheduledAt required');
    const scheduledDate = new Date(scheduledAt);
    if (scheduledDate.getTime() <= Date.now()) throw new Error('scheduledAt must be in the future');
    const post = await Post.create({ accountId, mediaPath, caption, scheduledAt: scheduledDate });
    await scheduleJob(REDIS_URL, { type: 'post', id: String(post._id) }, scheduledDate);
    return post.toObject();
  });

  ipcMain.handle('posts:update', async (_e, { id, caption, scheduledAt }: { id: string; caption?: string; scheduledAt?: string }) => {
    const update: Record<string, unknown> = {};
    if (caption !== undefined) update.caption = caption;
    if (scheduledAt) {
      const scheduledDate = new Date(scheduledAt);
      if (scheduledDate.getTime() <= Date.now()) throw new Error('scheduledAt must be in the future');
      update.scheduledAt = scheduledDate;
      update.status = 'pending';
    }
    const post = await Post.findByIdAndUpdate(id, update, { new: true });
    if (!post) throw new Error('Post not found');
    if (scheduledAt) {
      await scheduleJob(REDIS_URL, { type: 'post', id }, new Date(scheduledAt));
    }
    return post.toObject();
  });

  ipcMain.handle('posts:delete', async (_e, { id }: { id: string }) => {
    await Post.findByIdAndDelete(id);
    return { ok: true };
  });

  ipcMain.handle('posts:publishNow', async (_e, { id }: { id: string }) => {
    const jobId = await scheduleJob(REDIS_URL, { type: 'post', id }, new Date());
    return { jobId };
  });
}
```

- [ ] **Step 4: Crear ipc/stories.ts**

```typescript
// apps/desktop/src/main/ipc/stories.ts
import { ipcMain } from 'electron';
import { Story } from '../db/models/Story';
import { scheduleJob } from '../services/scheduler';

const REDIS_URL = process.env.REDIS_URL ?? 'redis://localhost:6379';

export function registerStoryHandlers(): void {
  ipcMain.handle('stories:list', async () => {
    return Story.find().sort({ scheduledAt: 1 }).lean();
  });

  ipcMain.handle('stories:create', async (_e, payload: {
    accountId: string; mediaPath: string; mediaType: 'image' | 'video';
    caption?: string; scheduledAt: string;
  }) => {
    const { accountId, mediaPath, mediaType, caption, scheduledAt } = payload;
    if (!accountId || !mediaPath || !mediaType || !scheduledAt) throw new Error('accountId, mediaPath, mediaType, scheduledAt required');
    const scheduledDate = new Date(scheduledAt);
    if (scheduledDate.getTime() <= Date.now()) throw new Error('scheduledAt must be in the future');
    const story = await Story.create({ accountId, mediaPath, mediaType, caption, scheduledAt: scheduledDate });
    await scheduleJob(REDIS_URL, { type: 'story', id: String(story._id) }, scheduledDate);
    return story.toObject();
  });

  ipcMain.handle('stories:update', async (_e, { id, caption, scheduledAt }: { id: string; caption?: string; scheduledAt?: string }) => {
    const update: Record<string, unknown> = {};
    if (caption !== undefined) update.caption = caption;
    if (scheduledAt) {
      const scheduledDate = new Date(scheduledAt);
      if (scheduledDate.getTime() <= Date.now()) throw new Error('scheduledAt must be in the future');
      update.scheduledAt = scheduledDate;
      update.status = 'pending';
    }
    const story = await Story.findByIdAndUpdate(id, update, { new: true });
    if (!story) throw new Error('Story not found');
    if (scheduledAt) {
      await scheduleJob(REDIS_URL, { type: 'story', id }, new Date(scheduledAt));
    }
    return story.toObject();
  });

  ipcMain.handle('stories:delete', async (_e, { id }: { id: string }) => {
    await Story.findByIdAndDelete(id);
    return { ok: true };
  });

  ipcMain.handle('stories:publishNow', async (_e, { id }: { id: string }) => {
    const jobId = await scheduleJob(REDIS_URL, { type: 'story', id }, new Date());
    return { jobId };
  });
}
```

- [ ] **Step 5: Crear ipc/metrics.ts**

```typescript
// apps/desktop/src/main/ipc/metrics.ts
import { ipcMain } from 'electron';
import { Metric } from '../db/models/Metric';
import { Account } from '../db/models/Account';
import { decrypt } from '../services/vault';
import { InstagramClient } from '../api-clients/instagram';
import { TikTokClient } from '../api-clients/tiktok';
import { FacebookClient } from '../api-clients/facebook';

const MASTER_KEY = process.env.VAULT_MASTER_KEY ?? 'change-me-in-prod-32chars!!!!!!!!';

function parseIgMetrics(raw: any) {
  return {
    followers:    raw.followers_count    ?? 0,
    reach:        raw.reach              ?? 0,
    impressions:  raw.impressions        ?? 0,
    profileViews: raw.profile_views      ?? 0,
    postsCount:   raw.media_count        ?? 0,
  };
}
function parseTtMetrics(raw: any) {
  const u = raw?.data?.user ?? {};
  return { followers: u.follower_count ?? 0, reach: 0, impressions: 0, profileViews: 0, postsCount: u.video_count ?? 0 };
}
function parseFbMetrics(raw: any) {
  const data: any[] = raw?.data ?? [];
  const find = (name: string) => data.find((d: any) => d.name === name)?.values?.[0]?.value ?? 0;
  return {
    followers:    find('page_fans'),
    reach:        find('page_impressions_day'),
    impressions:  find('page_impressions_day'),
    profileViews: find('page_views_total'),
    postsCount:   0,
  };
}

export function registerMetricHandlers(): void {
  ipcMain.handle('metrics:fetch', async (_e, { accountId }: { accountId: string }) => {
    const account = await Account.findById(accountId);
    if (!account) throw new Error('Account not found');
    const creds = JSON.parse(decrypt(account.credentialsEnc, MASTER_KEY));
    let raw: Record<string, unknown>;
    let parsed: ReturnType<typeof parseIgMetrics>;

    if (account.platform === 'instagram') {
      raw = await new InstagramClient(creds).getMetrics();
      parsed = parseIgMetrics(raw);
    } else if (account.platform === 'tiktok') {
      raw = await new TikTokClient(creds).getMetrics();
      parsed = parseTtMetrics(raw);
    } else {
      raw = await new FacebookClient(creds).getMetrics();
      parsed = parseFbMetrics(raw);
    }

    const metric = await Metric.create({ accountId, fetchedAt: new Date(), ...parsed, raw });
    return metric.toObject();
  });

  ipcMain.handle('metrics:history', async (_e, { accountId, limit = 30 }: { accountId: string; limit?: number }) => {
    return Metric.find({ accountId }).sort({ fetchedAt: -1 }).limit(limit).lean();
  });
}
```

- [ ] **Step 6: Crear ipc/register.ts**

```typescript
// apps/desktop/src/main/ipc/register.ts
import { registerClientHandlers }  from './clients';
import { registerAccountHandlers } from './accounts';
import { registerPostHandlers }    from './posts';
import { registerStoryHandlers }   from './stories';
import { registerMetricHandlers }  from './metrics';

export function registerAllHandlers(): void {
  registerClientHandlers();
  registerAccountHandlers();
  registerPostHandlers();
  registerStoryHandlers();
  registerMetricHandlers();
}
```

- [ ] **Step 7: Commit**

```bash
git add apps/desktop/src/main/ipc
git commit -m "feat: add IPC handlers for clients, accounts, posts, stories, metrics"
```

---

## Task 8: Electron main process (index.ts)

**Files:**
- Create: `apps/desktop/src/main/index.ts`
- Modify: `apps/desktop/src/main/` (reemplaza main.ts anterior)

- [ ] **Step 1: Crear index.ts**

```typescript
// apps/desktop/src/main/index.ts
import { app, BrowserWindow } from 'electron';
import path from 'path';
import dotenv from 'dotenv';
import { connectDb } from './db/connection';
import { registerAllHandlers } from './ipc/register';
import { startPublisherWorker } from './services/publisher';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI ?? 'mongodb://localhost:27017/juppao';
const REDIS_URL   = process.env.REDIS_URL   ?? 'redis://localhost:6379';

let win: BrowserWindow;

function createWindow(): void {
  win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 680,
    title: 'Juppao',
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  if (!app.isPackaged) {
    win.loadURL('http://localhost:5173');
    win.webContents.openDevTools({ mode: 'detach' });
  } else {
    win.loadFile(path.join(__dirname, '../renderer/index.html'));
  }
}

app.whenReady().then(async () => {
  await connectDb(MONGODB_URI);
  registerAllHandlers();
  startPublisherWorker(REDIS_URL);
  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
```

- [ ] **Step 2: Eliminar el antiguo main.ts si existe**

```bash
rm -f apps/desktop/src/main.ts apps/desktop/src/preload.ts
```

- [ ] **Step 3: Commit**

```bash
git add apps/desktop/src/main/index.ts
git commit -m "feat: wire electron main process with mongodb, ipc handlers, and publisher worker"
```

---

## Task 9: Preload / Context Bridge

**Files:**
- Create: `apps/desktop/src/preload/index.ts`

- [ ] **Step 1: Crear preload/index.ts**

```typescript
// apps/desktop/src/preload/index.ts
import { contextBridge, ipcRenderer } from 'electron';

type Channel =
  | 'clients:list' | 'clients:create' | 'clients:delete'
  | 'accounts:list' | 'accounts:create' | 'accounts:delete'
  | 'posts:list' | 'posts:create' | 'posts:update' | 'posts:delete' | 'posts:publishNow'
  | 'stories:list' | 'stories:create' | 'stories:update' | 'stories:delete' | 'stories:publishNow'
  | 'metrics:fetch' | 'metrics:history';

contextBridge.exposeInMainWorld('juppao', {
  invoke: (channel: Channel, payload?: unknown) =>
    ipcRenderer.invoke(channel, payload),
});
```

- [ ] **Step 2: Agregar tipos globales para el renderer**

Crear `apps/desktop/src/renderer/global.d.ts`:

```typescript
type JuppaoChannel =
  | 'clients:list' | 'clients:create' | 'clients:delete'
  | 'accounts:list' | 'accounts:create' | 'accounts:delete'
  | 'posts:list' | 'posts:create' | 'posts:update' | 'posts:delete' | 'posts:publishNow'
  | 'stories:list' | 'stories:create' | 'stories:update' | 'stories:delete' | 'stories:publishNow'
  | 'metrics:fetch' | 'metrics:history';

interface Window {
  juppao: {
    invoke<T = unknown>(channel: JuppaoChannel, payload?: unknown): Promise<T>;
  };
}
```

- [ ] **Step 3: Commit**

```bash
git add apps/desktop/src/preload apps/desktop/src/renderer/global.d.ts
git commit -m "feat: add preload context bridge with typed IPC channels"
```

---

## Task 10: Renderer — globals.css y hook useIpc

**Files:**
- Create: `apps/desktop/src/renderer/styles/globals.css`
- Create: `apps/desktop/src/renderer/hooks/useIpc.ts`
- Create: `apps/desktop/src/renderer/hooks/useToast.ts`

- [ ] **Step 1: Crear globals.css** (variables de diseño idénticas al desktop-ui existente, ampliadas)

```css
/* apps/desktop/src/renderer/styles/globals.css */
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

:root {
  --bg:      #0d0e10; --bg2: #141518; --bg3: #1c1e22; --bg4: #242629;
  --border:  #2a2d32; --border2: #383b42;
  --text:    #e8eaed; --muted: #6b7280; --subtle: #9ca3af;
  --accent:  #ff4d6d; --accent2: #ff8fa3;
  --ig:      #e1306c; --tt: #69c9d0; --fb: #1877f2;
  --success: #22c55e; --warn: #f59e0b; --danger: #ef4444;
  --font-display: 'Syne', sans-serif;
  --font-mono: 'DM Mono', monospace;
}

body { font-family: var(--font-mono); background: var(--bg); color: var(--text); font-size: 13px; line-height: 1.5; overflow: hidden; }

/* Scrollbar */
::-webkit-scrollbar { width: 4px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: var(--border2); border-radius: 4px; }

/* Buttons */
.btn {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 7px 14px; border-radius: 6px; font-size: 12px;
  font-family: var(--font-mono); cursor: pointer;
  border: 1px solid var(--border2); background: var(--bg3); color: var(--text);
  transition: all 0.12s;
}
.btn:hover { background: var(--bg4); }
.btn-primary { background: var(--accent); border-color: var(--accent); color: #fff; }
.btn-primary:hover { background: #e0304f; border-color: #e0304f; }
.btn-sm { padding: 4px 10px; font-size: 11px; }
.btn-danger { border-color: var(--danger); color: var(--danger); }
.btn-success { border-color: var(--success); color: var(--success); }

/* Form inputs */
.form-group { margin-bottom: 14px; }
.form-label { font-size: 11px; color: var(--muted); text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 6px; display: block; }
.form-input, .form-select {
  width: 100%; background: var(--bg3); border: 1px solid var(--border2);
  border-radius: 6px; padding: 9px 12px; font-size: 13px;
  font-family: var(--font-mono); color: var(--text); outline: none;
  transition: border-color 0.12s; appearance: none;
}
.form-input:focus, .form-select:focus { border-color: var(--accent); }
.form-input::placeholder { color: var(--muted); }
.form-row { display: flex; gap: 10px; }
.form-row .form-group { flex: 1; }

/* Table */
.table-wrap { background: var(--bg2); border: 1px solid var(--border); border-radius: 10px; overflow: hidden; margin-bottom: 24px; }
table { width: 100%; border-collapse: collapse; }
thead tr { border-bottom: 1px solid var(--border); }
th { padding: 10px 16px; font-size: 10px; letter-spacing: 0.1em; text-transform: uppercase; color: var(--muted); text-align: left; font-weight: 500; }
td { padding: 12px 16px; font-size: 12px; color: var(--subtle); border-bottom: 1px solid var(--border); }
tr:last-child td { border-bottom: none; }
tbody tr:hover td { background: var(--bg3); color: var(--text); }

/* Empty state */
.empty { padding: 48px 20px; text-align: center; color: var(--muted); font-size: 12px; }
.empty-icon { font-size: 28px; margin-bottom: 10px; opacity: 0.4; }

/* Modal */
.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.7); display: flex; align-items: center; justify-content: center; z-index: 100; opacity: 0; pointer-events: none; transition: opacity 0.15s; }
.modal-overlay.open { opacity: 1; pointer-events: all; }
.modal { background: var(--bg2); border: 1px solid var(--border2); border-radius: 12px; padding: 28px; width: 460px; max-width: 90vw; transform: translateY(8px); transition: transform 0.15s; }
.modal-overlay.open .modal { transform: translateY(0); }
.modal-title { font-size: 16px; font-weight: 700; margin-bottom: 20px; }
.modal-actions { display: flex; gap: 10px; justify-content: flex-end; margin-top: 20px; }

/* Toast */
.toast { position: fixed; bottom: 24px; right: 24px; background: var(--bg4); border: 1px solid var(--border2); border-radius: 8px; padding: 12px 18px; font-size: 12px; transform: translateY(60px); opacity: 0; transition: all 0.2s; z-index: 200; }
.toast.show { transform: translateY(0); opacity: 1; }
.toast.success { border-left: 3px solid var(--success); }
.toast.error { border-left: 3px solid var(--danger); }

/* Layout */
#root { display: flex; height: 100vh; overflow: hidden; }
input[type="datetime-local"] { color-scheme: dark; }
@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
@keyframes spin { to { transform: rotate(360deg); } }
```

- [ ] **Step 2: Crear hooks/useIpc.ts**

```typescript
// apps/desktop/src/renderer/hooks/useIpc.ts
export function useIpc() {
  async function invoke<T = unknown>(channel: JuppaoChannel, payload?: unknown): Promise<T> {
    return window.juppao.invoke<T>(channel, payload);
  }
  return { invoke };
}
```

- [ ] **Step 3: Crear hooks/useToast.ts**

```typescript
// apps/desktop/src/renderer/hooks/useToast.ts
import { useState, useCallback } from 'react';

export interface ToastState { message: string; type: 'success' | 'error'; visible: boolean; }

export function useToast() {
  const [toast, setToast] = useState<ToastState>({ message: '', type: 'success', visible: false });

  const showToast = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type, visible: true });
    setTimeout(() => setToast(t => ({ ...t, visible: false })), 3000);
  }, []);

  return { toast, showToast };
}
```

- [ ] **Step 4: Commit**

```bash
git add apps/desktop/src/renderer/styles apps/desktop/src/renderer/hooks
git commit -m "feat: add globals.css design tokens and useIpc/useToast hooks"
```

---

## Task 11: Renderer — Componentes reutilizables

**Files:**
- Create: `apps/desktop/src/renderer/components/Badge.tsx`
- Create: `apps/desktop/src/renderer/components/StatCard.tsx`
- Create: `apps/desktop/src/renderer/components/Modal.tsx`
- Create: `apps/desktop/src/renderer/components/Toast.tsx`
- Create: `apps/desktop/src/renderer/components/Sidebar.tsx`
- Create: `apps/desktop/src/renderer/components/TopBar.tsx`

- [ ] **Step 1: Crear Badge.tsx**

```tsx
// apps/desktop/src/renderer/components/Badge.tsx
import React from 'react';

type PlatformBadgeProps = { platform: 'instagram' | 'tiktok' | 'facebook' };
type StatusBadgeProps   = { status: 'pending' | 'publishing' | 'done' | 'failed' };

export function PlatformBadge({ platform }: PlatformBadgeProps) {
  const map = { instagram: ['ig', 'IG'], tiktok: ['tt', 'TT'], facebook: ['fb', 'FB'] } as const;
  const [cls, lbl] = map[platform];
  return (
    <span className={`platform ${cls}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 8px', borderRadius: 4, fontSize: 11 }}>
      <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'currentColor', display: 'inline-block' }} />
      {lbl}
    </span>
  );
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const labels = { pending: 'Pendiente', done: 'Publicado', failed: 'Fallido', publishing: 'Publicando...' };
  return <span className={`status ${status}`} style={{ display: 'inline-flex', alignItems: 'center', padding: '3px 8px', borderRadius: 4, fontSize: 11 }}>{labels[status]}</span>;
}
```

- [ ] **Step 2: Crear StatCard.tsx**

```tsx
// apps/desktop/src/renderer/components/StatCard.tsx
import React from 'react';

interface StatCardProps { label: string; value: number | string; sub: string; variant: 'total' | 'pending' | 'done' | 'failed'; }

export function StatCard({ label, value, sub, variant }: StatCardProps) {
  return (
    <div className={`stat-card s-${variant}`} style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 10, padding: '18px 20px', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: variant === 'total' ? 'var(--accent)' : variant === 'pending' ? 'var(--warn)' : variant === 'done' ? 'var(--success)' : 'var(--danger)' }} />
      <div style={{ fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 10 }}>{label}</div>
      <div style={{ fontSize: 36, fontWeight: 800, color: 'var(--text)', lineHeight: 1, letterSpacing: -1 }}>{value}</div>
      <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 6 }}>{sub}</div>
    </div>
  );
}
```

- [ ] **Step 3: Crear Modal.tsx**

```tsx
// apps/desktop/src/renderer/components/Modal.tsx
import React from 'react';

interface ModalProps { id: string; title: string; open: boolean; onClose: () => void; children: React.ReactNode; }

export function Modal({ id, title, open, onClose, children }: ModalProps) {
  return (
    <div id={id} className={`modal-overlay${open ? ' open' : ''}`} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal">
        <div className="modal-title">{title}</div>
        {children}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Crear Toast.tsx**

```tsx
// apps/desktop/src/renderer/components/Toast.tsx
import React from 'react';
import { ToastState } from '../hooks/useToast';

export function Toast({ toast }: { toast: ToastState }) {
  return (
    <div className={`toast ${toast.type}${toast.visible ? ' show' : ''}`}>
      {toast.message}
    </div>
  );
}
```

- [ ] **Step 5: Crear Sidebar.tsx**

```tsx
// apps/desktop/src/renderer/components/Sidebar.tsx
import React from 'react';

type Page = 'dashboard' | 'clients' | 'accounts' | 'posts' | 'stories' | 'schedule' | 'metrics';

interface SidebarProps {
  currentPage: Page;
  onNavigate: (page: Page) => void;
  badges: { clients: number; accounts: number; posts: number; stories: number };
}

interface NavItemProps { page: Page; icon: string; label: string; badge?: number; current: Page; onNavigate: (p: Page) => void; }

function NavItem({ page, icon, label, badge, current, onNavigate }: NavItemProps) {
  return (
    <button className={`nav-item${current === page ? ' active' : ''}`} onClick={() => onNavigate(page)}>
      <span className="nav-icon">{icon}</span> {label}
      {badge !== undefined && <span className="nav-badge">{badge}</span>}
    </button>
  );
}

export function Sidebar({ currentPage, onNavigate, badges }: SidebarProps) {
  return (
    <aside style={{ width: 220, minWidth: 220, background: 'var(--bg2)', borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '24px 20px 20px', borderBottom: '1px solid var(--border)' }}>
        <div style={{ fontWeight: 800, fontSize: 20, letterSpacing: -0.5, display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--accent)', flexShrink: 0, display: 'inline-block' }} />
          Juppao
        </div>
        <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 3, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Social Media Manager</div>
      </div>

      <nav style={{ flex: 1, padding: '12px 10px' }}>
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--muted)', padding: '0 10px', marginBottom: 6 }}>Principal</div>
          <NavItem page="dashboard" icon="◈" label="Dashboard" current={currentPage} onNavigate={onNavigate} />
          <NavItem page="clients"   icon="◉" label="Clientes"  badge={badges.clients}  current={currentPage} onNavigate={onNavigate} />
          <NavItem page="accounts"  icon="◎" label="Cuentas"   badge={badges.accounts} current={currentPage} onNavigate={onNavigate} />
          <NavItem page="metrics"   icon="◐" label="Métricas"  current={currentPage} onNavigate={onNavigate} />
        </div>
        <div>
          <div style={{ fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--muted)', padding: '0 10px', marginBottom: 6 }}>Publicación</div>
          <NavItem page="schedule" icon="◷" label="Programar"  current={currentPage} onNavigate={onNavigate} />
          <NavItem page="posts"    icon="◈" label="Posts"    badge={badges.posts}   current={currentPage} onNavigate={onNavigate} />
          <NavItem page="stories"  icon="◑" label="Historias" badge={badges.stories} current={currentPage} onNavigate={onNavigate} />
        </div>
      </nav>

      <div style={{ padding: '14px 20px', borderTop: '1px solid var(--border)' }}>
        <span style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', background: 'var(--success)', marginRight: 6, animation: 'pulse 2s infinite' }} />
        <span style={{ fontSize: 11, color: 'var(--muted)' }}>MongoDB activo</span>
      </div>
    </aside>
  );
}
```

- [ ] **Step 6: Crear TopBar.tsx**

```tsx
// apps/desktop/src/renderer/components/TopBar.tsx
import React from 'react';

interface TopBarProps { title: string; onRefresh: () => void; actionLabel?: string; onAction?: () => void; }

export function TopBar({ title, onRefresh, actionLabel, onAction }: TopBarProps) {
  return (
    <div style={{ height: 56, borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', padding: '0 28px', gap: 16, flexShrink: 0 }}>
      <span style={{ fontWeight: 700, fontSize: 16, letterSpacing: -0.3 }}>{title}</span>
      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10 }}>
        <button className="btn" onClick={onRefresh}>↻ Actualizar</button>
        {actionLabel && onAction && (
          <button className="btn btn-primary" onClick={onAction}>{actionLabel}</button>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 7: Commit**

```bash
git add apps/desktop/src/renderer/components
git commit -m "feat: add reusable UI components (Badge, StatCard, Modal, Toast, Sidebar, TopBar)"
```

---

## Task 12: Pages — Dashboard, Clients, Accounts

**Files:**
- Create: `apps/desktop/src/renderer/pages/Dashboard.tsx`
- Create: `apps/desktop/src/renderer/pages/Clients.tsx`
- Create: `apps/desktop/src/renderer/pages/Accounts.tsx`

- [ ] **Step 1: Crear Dashboard.tsx**

```tsx
// apps/desktop/src/renderer/pages/Dashboard.tsx
import React from 'react';
import { StatCard } from '../components/StatCard';
import { PlatformBadge, StatusBadge } from '../components/Badge';

interface DashboardProps {
  clients: any[];
  posts: any[];
  stories: any[];
  accounts: any[];
}

function fmtDate(ts: string | Date) {
  if (!ts) return '—';
  return new Date(ts).toLocaleString('es-CO', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export function Dashboard({ clients, posts, stories, accounts }: DashboardProps) {
  const allContent = [...posts, ...stories];
  const pending = allContent.filter(p => p.status === 'pending').length;
  const done    = allContent.filter(p => p.status === 'done').length;
  const failed  = allContent.filter(p => p.status === 'failed').length;

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 28 }}>
        <StatCard label="Clientes activos" value={clients.length} sub="gestionados" variant="total" />
        <StatCard label="Pendientes"        value={pending}       sub="en cola"    variant="pending" />
        <StatCard label="Publicados"         value={done}          sub="exitosos"   variant="done" />
        <StatCard label="Fallidos"           value={failed}        sub="con error"  variant="failed" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        <div>
          <div style={{ marginBottom: 12, fontWeight: 700, fontSize: 14 }}>Últimos posts</div>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Media</th><th>Plataforma</th><th>Estado</th><th>Programado</th></tr></thead>
              <tbody>
                {posts.slice(0,5).length === 0
                  ? <tr><td colSpan={4}><div className="empty"><div className="empty-icon">◈</div>Sin posts</div></td></tr>
                  : posts.slice(0,5).map(p => {
                      const acc = accounts.find(a => a._id === p.accountId);
                      return <tr key={p._id}>
                        <td style={{ fontSize: 11, color: 'var(--muted)' }}>{p.mediaPath.length > 22 ? '…' + p.mediaPath.slice(-18) : p.mediaPath}</td>
                        <td>{acc ? <PlatformBadge platform={acc.platform} /> : '—'}</td>
                        <td><StatusBadge status={p.status} /></td>
                        <td>{fmtDate(p.scheduledAt)}</td>
                      </tr>;
                    })
                }
              </tbody>
            </table>
          </div>
        </div>
        <div>
          <div style={{ marginBottom: 12, fontWeight: 700, fontSize: 14 }}>Últimas historias</div>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Media</th><th>Tipo</th><th>Estado</th><th>Programado</th></tr></thead>
              <tbody>
                {stories.slice(0,5).length === 0
                  ? <tr><td colSpan={4}><div className="empty"><div className="empty-icon">◑</div>Sin historias</div></td></tr>
                  : stories.slice(0,5).map(s => <tr key={s._id}>
                      <td style={{ fontSize: 11, color: 'var(--muted)' }}>{s.mediaPath.length > 22 ? '…' + s.mediaPath.slice(-18) : s.mediaPath}</td>
                      <td style={{ fontSize: 11, textTransform: 'uppercase', color: 'var(--muted)' }}>{s.mediaType}</td>
                      <td><StatusBadge status={s.status} /></td>
                      <td>{fmtDate(s.scheduledAt)}</td>
                    </tr>)
                }
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Crear Clients.tsx**

```tsx
// apps/desktop/src/renderer/pages/Clients.tsx
import React, { useState } from 'react';
import { Modal } from '../components/Modal';

interface ClientsProps {
  clients: any[];
  onCreateClient: (name: string) => Promise<void>;
  onDeleteClient: (id: string) => Promise<void>;
  showToast: (msg: string, type?: 'success' | 'error') => void;
}

function fmtDate(ts: string) { return ts ? new Date(ts).toLocaleDateString('es-CO') : '—'; }

export function Clients({ clients, onCreateClient, onDeleteClient, showToast }: ClientsProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleCreate() {
    if (!name.trim()) { showToast('Ingresa un nombre', 'error'); return; }
    setLoading(true);
    try { await onCreateClient(name.trim()); setOpen(false); setName(''); }
    catch (e: any) { showToast(e.message ?? 'Error al crear cliente', 'error'); }
    finally { setLoading(false); }
  }

  async function handleDelete(id: string, clientName: string) {
    if (!confirm(`¿Eliminar cliente "${clientName}"?`)) return;
    try { await onDeleteClient(id); showToast('Cliente eliminado'); }
    catch (e: any) { showToast(e.message ?? 'Error al eliminar', 'error'); }
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <span style={{ fontWeight: 700, fontSize: 14 }}>Clientes ({clients.length})</span>
        <button className="btn btn-primary" onClick={() => setOpen(true)}>+ Cliente</button>
      </div>
      <div className="table-wrap">
        <table>
          <thead><tr><th>Nombre</th><th>ID</th><th>Creado</th><th>Acciones</th></tr></thead>
          <tbody>
            {!clients.length
              ? <tr><td colSpan={4}><div className="empty"><div className="empty-icon">◉</div>Sin clientes. Crea el primero.</div></td></tr>
              : clients.map(c => <tr key={c._id}>
                  <td style={{ color: 'var(--text)', fontWeight: 500 }}>{c.name}</td>
                  <td style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--muted)' }}>{String(c._id).slice(0,8)}…</td>
                  <td>{fmtDate(c.createdAt)}</td>
                  <td><button className="btn btn-sm btn-danger" onClick={() => handleDelete(c._id, c.name)}>Eliminar</button></td>
                </tr>)
            }
          </tbody>
        </table>
      </div>

      <Modal id="modal-client" title="Nuevo cliente" open={open} onClose={() => setOpen(false)}>
        <div className="form-group">
          <label className="form-label">Nombre de la agencia / marca</label>
          <input className="form-input" value={name} onChange={e => setName(e.target.value)} placeholder="Ej: Agencia XYZ Colombia"
            onKeyDown={e => e.key === 'Enter' && handleCreate()} />
        </div>
        <div className="modal-actions">
          <button className="btn" onClick={() => setOpen(false)}>Cancelar</button>
          <button className="btn btn-primary" onClick={handleCreate} disabled={loading}>
            {loading ? 'Creando…' : 'Crear cliente'}
          </button>
        </div>
      </Modal>
    </div>
  );
}
```

- [ ] **Step 3: Crear Accounts.tsx**

```tsx
// apps/desktop/src/renderer/pages/Accounts.tsx
import React, { useState } from 'react';
import { Modal } from '../components/Modal';
import { PlatformBadge } from '../components/Badge';

interface AccountsProps {
  accounts: any[];
  clients: any[];
  onCreateAccount: (payload: any) => Promise<void>;
  onDeleteAccount: (id: string) => Promise<void>;
  showToast: (msg: string, type?: 'success' | 'error') => void;
}

const PLATFORMS = ['instagram', 'tiktok', 'facebook'] as const;

export function Accounts({ accounts, clients, onCreateAccount, onDeleteAccount, showToast }: AccountsProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ clientId: '', platform: 'instagram', username: '', accessToken: '', igUserId: '', pageId: '', openId: '' });

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  async function handleCreate() {
    if (!form.clientId || !form.username || !form.accessToken) { showToast('Completa todos los campos requeridos', 'error'); return; }
    setLoading(true);
    try {
      await onCreateAccount({ ...form });
      setOpen(false);
      setForm({ clientId: '', platform: 'instagram', username: '', accessToken: '', igUserId: '', pageId: '', openId: '' });
    } catch (e: any) { showToast(e.message ?? 'Error al crear cuenta', 'error'); }
    finally { setLoading(false); }
  }

  const clientName = (clientId: string) => {
    const c = clients.find(c => c._id === clientId || String(c._id) === String(clientId));
    return c?.name ?? clientId?.slice?.(0,8) ?? '—';
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <span style={{ fontWeight: 700, fontSize: 14 }}>Cuentas sociales ({accounts.length})</span>
        <button className="btn btn-primary" onClick={() => setOpen(true)}>+ Cuenta</button>
      </div>
      <div className="table-wrap">
        <table>
          <thead><tr><th>Usuario</th><th>Plataforma</th><th>Cliente</th><th>Acciones</th></tr></thead>
          <tbody>
            {!accounts.length
              ? <tr><td colSpan={4}><div className="empty"><div className="empty-icon">◎</div>Sin cuentas. Agrega una.</div></td></tr>
              : accounts.map(a => <tr key={a._id}>
                  <td style={{ color: 'var(--text)', fontWeight: 500 }}>{a.username}</td>
                  <td><PlatformBadge platform={a.platform} /></td>
                  <td>{clientName(a.clientId)}</td>
                  <td><button className="btn btn-sm btn-danger" onClick={async () => { if (confirm('¿Eliminar cuenta?')) { try { await onDeleteAccount(a._id); showToast('Cuenta eliminada'); } catch { showToast('Error', 'error'); } } }}>Eliminar</button></td>
                </tr>)
            }
          </tbody>
        </table>
      </div>

      <Modal id="modal-account" title="Nueva cuenta social" open={open} onClose={() => setOpen(false)}>
        <div className="form-group">
          <label className="form-label">Cliente</label>
          <select className="form-select" value={form.clientId} onChange={e => set('clientId', e.target.value)}>
            <option value="">Selecciona un cliente…</option>
            {clients.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
          </select>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Plataforma</label>
            <select className="form-select" value={form.platform} onChange={e => set('platform', e.target.value)}>
              {PLATFORMS.map(p => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Usuario</label>
            <input className="form-input" value={form.username} onChange={e => set('username', e.target.value)} placeholder="@usuario" />
          </div>
        </div>
        <div className="form-group">
          <label className="form-label">Access Token</label>
          <input className="form-input" type="password" value={form.accessToken} onChange={e => set('accessToken', e.target.value)} placeholder="••••••••••••" />
        </div>
        {form.platform === 'instagram' && (
          <div className="form-group">
            <label className="form-label">IG User ID</label>
            <input className="form-input" value={form.igUserId} onChange={e => set('igUserId', e.target.value)} placeholder="123456789" />
          </div>
        )}
        {form.platform === 'facebook' && (
          <div className="form-group">
            <label className="form-label">Page ID</label>
            <input className="form-input" value={form.pageId} onChange={e => set('pageId', e.target.value)} placeholder="123456789" />
          </div>
        )}
        {form.platform === 'tiktok' && (
          <div className="form-group">
            <label className="form-label">Open ID</label>
            <input className="form-input" value={form.openId} onChange={e => set('openId', e.target.value)} placeholder="open_id_xxx" />
          </div>
        )}
        <div className="modal-actions">
          <button className="btn" onClick={() => setOpen(false)}>Cancelar</button>
          <button className="btn btn-primary" onClick={handleCreate} disabled={loading}>{loading ? 'Guardando…' : 'Guardar cuenta'}</button>
        </div>
      </Modal>
    </div>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add apps/desktop/src/renderer/pages/Dashboard.tsx apps/desktop/src/renderer/pages/Clients.tsx apps/desktop/src/renderer/pages/Accounts.tsx
git commit -m "feat: add Dashboard, Clients, Accounts pages"
```

---

## Task 13: Pages — Posts, Stories, Schedule

**Files:**
- Create: `apps/desktop/src/renderer/pages/Posts.tsx`
- Create: `apps/desktop/src/renderer/pages/Stories.tsx`
- Create: `apps/desktop/src/renderer/pages/Schedule.tsx`

- [ ] **Step 1: Crear Posts.tsx**

```tsx
// apps/desktop/src/renderer/pages/Posts.tsx
import React, { useState } from 'react';
import { PlatformBadge, StatusBadge } from '../components/Badge';
import { Modal } from '../components/Modal';

interface PostsProps {
  posts: any[]; accounts: any[];
  onUpdate: (id: string, data: { caption?: string; scheduledAt?: string }) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onPublishNow: (id: string) => Promise<void>;
  showToast: (msg: string, type?: 'success' | 'error') => void;
}

function fmtDate(ts: string) { return ts ? new Date(ts).toLocaleString('es-CO', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'; }

export function Posts({ posts, accounts, onUpdate, onDelete, onPublishNow, showToast }: PostsProps) {
  const [editPost, setEditPost] = useState<any>(null);
  const [caption, setCaption] = useState('');
  const [scheduledAt, setScheduledAt] = useState('');

  function openEdit(post: any) {
    setEditPost(post);
    setCaption(post.caption ?? '');
    setScheduledAt(new Date(post.scheduledAt).toISOString().slice(0,16));
  }

  async function handleUpdate() {
    if (!editPost) return;
    try {
      await onUpdate(editPost._id, { caption, scheduledAt });
      showToast('Post actualizado');
      setEditPost(null);
    } catch (e: any) { showToast(e.message ?? 'Error', 'error'); }
  }

  const accName = (id: string) => accounts.find(a => String(a._id) === String(id));

  return (
    <div>
      <div style={{ marginBottom: 12, fontWeight: 700, fontSize: 14 }}>Posts programados ({posts.length})</div>
      <div className="table-wrap">
        <table>
          <thead><tr><th>Media</th><th>Cuenta</th><th>Programado</th><th>Estado</th><th>Acciones</th></tr></thead>
          <tbody>
            {!posts.length
              ? <tr><td colSpan={5}><div className="empty"><div className="empty-icon">◈</div>Sin posts programados</div></td></tr>
              : posts.map(p => {
                  const acc = accName(p.accountId);
                  return <tr key={p._id}>
                    <td style={{ fontSize: 11, color: 'var(--muted)' }} title={p.mediaPath}>{p.mediaPath.length > 28 ? '…' + p.mediaPath.slice(-24) : p.mediaPath}</td>
                    <td>{acc ? <PlatformBadge platform={acc.platform} /> : '—'}</td>
                    <td>{fmtDate(p.scheduledAt)}</td>
                    <td><StatusBadge status={p.status} /></td>
                    <td style={{ display: 'flex', gap: 6 }}>
                      <button className="btn btn-sm" onClick={() => openEdit(p)}>Editar</button>
                      {p.status === 'pending' && <button className="btn btn-sm btn-success" onClick={async () => { try { const r: any = await onPublishNow(p._id); showToast(`Job #${r.jobId} encolado`); } catch { showToast('Error', 'error'); } }}>↗ Publicar</button>}
                      <button className="btn btn-sm btn-danger" onClick={async () => { if (confirm('¿Eliminar post?')) { try { await onDelete(p._id); showToast('Post eliminado'); } catch { showToast('Error', 'error'); } } }}>✕</button>
                    </td>
                  </tr>;
                })
            }
          </tbody>
        </table>
      </div>

      <Modal id="modal-edit-post" title="Editar post" open={!!editPost} onClose={() => setEditPost(null)}>
        <div className="form-group">
          <label className="form-label">Caption</label>
          <input className="form-input" value={caption} onChange={e => setCaption(e.target.value)} />
        </div>
        <div className="form-group">
          <label className="form-label">Fecha de publicación</label>
          <input className="form-input" type="datetime-local" value={scheduledAt} onChange={e => setScheduledAt(e.target.value)} />
        </div>
        <div className="modal-actions">
          <button className="btn" onClick={() => setEditPost(null)}>Cancelar</button>
          <button className="btn btn-primary" onClick={handleUpdate}>Guardar cambios</button>
        </div>
      </Modal>
    </div>
  );
}
```

- [ ] **Step 2: Crear Stories.tsx**

```tsx
// apps/desktop/src/renderer/pages/Stories.tsx
import React, { useState } from 'react';
import { PlatformBadge, StatusBadge } from '../components/Badge';
import { Modal } from '../components/Modal';

interface StoriesProps {
  stories: any[]; accounts: any[];
  onUpdate: (id: string, data: { caption?: string; scheduledAt?: string }) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onPublishNow: (id: string) => Promise<void>;
  showToast: (msg: string, type?: 'success' | 'error') => void;
}

function fmtDate(ts: string) { return ts ? new Date(ts).toLocaleString('es-CO', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'; }

export function Stories({ stories, accounts, onUpdate, onDelete, onPublishNow, showToast }: StoriesProps) {
  const [editStory, setEditStory] = useState<any>(null);
  const [caption, setCaption] = useState('');
  const [scheduledAt, setScheduledAt] = useState('');

  function openEdit(story: any) {
    setEditStory(story);
    setCaption(story.caption ?? '');
    setScheduledAt(new Date(story.scheduledAt).toISOString().slice(0,16));
  }

  async function handleUpdate() {
    if (!editStory) return;
    try { await onUpdate(editStory._id, { caption, scheduledAt }); showToast('Historia actualizada'); setEditStory(null); }
    catch (e: any) { showToast(e.message ?? 'Error', 'error'); }
  }

  const accName = (id: string) => accounts.find(a => String(a._id) === String(id));

  return (
    <div>
      <div style={{ marginBottom: 12, fontWeight: 700, fontSize: 14 }}>Historias ({stories.length})</div>
      <div className="table-wrap">
        <table>
          <thead><tr><th>Media</th><th>Tipo</th><th>Cuenta</th><th>Programado</th><th>Estado</th><th>Acciones</th></tr></thead>
          <tbody>
            {!stories.length
              ? <tr><td colSpan={6}><div className="empty"><div className="empty-icon">◑</div>Sin historias programadas</div></td></tr>
              : stories.map(s => {
                  const acc = accName(s.accountId);
                  return <tr key={s._id}>
                    <td style={{ fontSize: 11, color: 'var(--muted)' }} title={s.mediaPath}>{s.mediaPath.length > 24 ? '…' + s.mediaPath.slice(-20) : s.mediaPath}</td>
                    <td style={{ fontSize: 11, textTransform: 'uppercase', color: 'var(--muted)' }}>{s.mediaType}</td>
                    <td>{acc ? <PlatformBadge platform={acc.platform} /> : '—'}</td>
                    <td>{fmtDate(s.scheduledAt)}</td>
                    <td><StatusBadge status={s.status} /></td>
                    <td style={{ display: 'flex', gap: 6 }}>
                      <button className="btn btn-sm" onClick={() => openEdit(s)}>Editar</button>
                      {s.status === 'pending' && <button className="btn btn-sm btn-success" onClick={async () => { try { const r: any = await onPublishNow(s._id); showToast(`Job #${r.jobId} encolado`); } catch { showToast('Error', 'error'); } }}>↗ Publicar</button>}
                      <button className="btn btn-sm btn-danger" onClick={async () => { if (confirm('¿Eliminar historia?')) { try { await onDelete(s._id); showToast('Historia eliminada'); } catch { showToast('Error', 'error'); } } }}>✕</button>
                    </td>
                  </tr>;
                })
            }
          </tbody>
        </table>
      </div>

      <Modal id="modal-edit-story" title="Editar historia" open={!!editStory} onClose={() => setEditStory(null)}>
        <div className="form-group">
          <label className="form-label">Caption (opcional)</label>
          <input className="form-input" value={caption} onChange={e => setCaption(e.target.value)} />
        </div>
        <div className="form-group">
          <label className="form-label">Fecha de publicación</label>
          <input className="form-input" type="datetime-local" value={scheduledAt} onChange={e => setScheduledAt(e.target.value)} />
        </div>
        <div className="modal-actions">
          <button className="btn" onClick={() => setEditStory(null)}>Cancelar</button>
          <button className="btn btn-primary" onClick={handleUpdate}>Guardar cambios</button>
        </div>
      </Modal>
    </div>
  );
}
```

- [ ] **Step 3: Crear Schedule.tsx (formulario unificado para posts y stories)**

```tsx
// apps/desktop/src/renderer/pages/Schedule.tsx
import React, { useState } from 'react';

interface ScheduleProps {
  accounts: any[];
  onCreatePost: (payload: any) => Promise<void>;
  onCreateStory: (payload: any) => Promise<void>;
  showToast: (msg: string, type?: 'success' | 'error') => void;
}

type ContentType = 'post' | 'story';

export function Schedule({ accounts, onCreatePost, onCreateStory, showToast }: ScheduleProps) {
  const defaultDate = () => { const d = new Date(); d.setHours(d.getHours() + 1); return d.toISOString().slice(0,16); };
  const [type, setType] = useState<ContentType>('post');
  const [accountId, setAccountId] = useState('');
  const [mediaPath, setMediaPath] = useState('');
  const [caption, setCaption] = useState('');
  const [mediaType, setMediaType] = useState<'image' | 'video'>('video');
  const [scheduledAt, setScheduledAt] = useState(defaultDate);
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    if (!accountId || !mediaPath || !scheduledAt) { showToast('Completa todos los campos requeridos', 'error'); return; }
    setLoading(true);
    try {
      if (type === 'post') {
        await onCreatePost({ accountId, mediaPath, caption, scheduledAt });
        showToast('Post programado exitosamente');
      } else {
        await onCreateStory({ accountId, mediaPath, mediaType, caption, scheduledAt });
        showToast('Historia programada exitosamente');
      }
      setMediaPath(''); setCaption(''); setScheduledAt(defaultDate());
    } catch (e: any) { showToast(e.message ?? 'Error al programar', 'error'); }
    finally { setLoading(false); }
  }

  return (
    <div>
      <div style={{ marginBottom: 20, fontWeight: 700, fontSize: 14 }}>Programar contenido</div>
      <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 10, padding: 28, maxWidth: 560 }}>

        {/* Tipo de contenido */}
        <div className="form-group">
          <label className="form-label">Tipo de contenido</label>
          <div style={{ display: 'flex', gap: 8 }}>
            {(['post', 'story'] as ContentType[]).map(t => (
              <button key={t} className={`btn${type === t ? ' btn-primary' : ''}`} onClick={() => setType(t)} style={{ flex: 1, justifyContent: 'center' }}>
                {t === 'post' ? '◈ Post / Reel' : '◑ Historia'}
              </button>
            ))}
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Cuenta destino</label>
          <select className="form-select" value={accountId} onChange={e => setAccountId(e.target.value)}>
            <option value="">Selecciona una cuenta…</option>
            {accounts.map(a => <option key={a._id} value={a._id}>{a.username} ({a.platform})</option>)}
          </select>
        </div>

        <div className="form-group">
          <label className="form-label">URL del media (video / imagen)</label>
          <input className="form-input" value={mediaPath} onChange={e => setMediaPath(e.target.value)} placeholder="https://cdn.example.com/video.mp4" />
        </div>

        {type === 'story' && (
          <div className="form-group">
            <label className="form-label">Tipo de media</label>
            <select className="form-select" value={mediaType} onChange={e => setMediaType(e.target.value as 'image' | 'video')}>
              <option value="video">Video</option>
              <option value="image">Imagen</option>
            </select>
          </div>
        )}

        <div className="form-group">
          <label className="form-label">Caption / descripción {type === 'story' ? '(opcional)' : ''}</label>
          <input className="form-input" value={caption} onChange={e => setCaption(e.target.value)} placeholder="¡Nuevo contenido! #marketing" />
        </div>

        <div className="form-group">
          <label className="form-label">Fecha y hora de publicación</label>
          <input className="form-input" type="datetime-local" value={scheduledAt} onChange={e => setScheduledAt(e.target.value)} />
        </div>

        <button className="btn btn-primary" onClick={handleSubmit} disabled={loading} style={{ width: '100%', justifyContent: 'center', padding: 11, marginTop: 8 }}>
          {loading ? 'Programando…' : `↗ Programar ${type === 'post' ? 'post' : 'historia'}`}
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add apps/desktop/src/renderer/pages/Posts.tsx apps/desktop/src/renderer/pages/Stories.tsx apps/desktop/src/renderer/pages/Schedule.tsx
git commit -m "feat: add Posts, Stories, and Schedule pages with CRUD and edit support"
```

---

## Task 14: Page — Metrics

**Files:**
- Create: `apps/desktop/src/renderer/pages/Metrics.tsx`

- [ ] **Step 1: Crear Metrics.tsx**

```tsx
// apps/desktop/src/renderer/pages/Metrics.tsx
import React, { useState } from 'react';
import { PlatformBadge } from '../components/Badge';

interface MetricsProps {
  accounts: any[];
  onFetchMetrics: (accountId: string) => Promise<any>;
  showToast: (msg: string, type?: 'success' | 'error') => void;
}

export function Metrics({ accounts, onFetchMetrics, showToast }: MetricsProps) {
  const [selected, setSelected] = useState('');
  const [loading, setLoading] = useState(false);
  const [metric, setMetric] = useState<any>(null);

  async function handleFetch() {
    if (!selected) { showToast('Selecciona una cuenta', 'error'); return; }
    setLoading(true);
    try {
      const m = await onFetchMetrics(selected);
      setMetric(m);
      showToast('Métricas actualizadas');
    } catch (e: any) { showToast(e.message ?? 'Error al obtener métricas', 'error'); }
    finally { setLoading(false); }
  }

  const selectedAcc = accounts.find(a => String(a._id) === selected);

  return (
    <div>
      <div style={{ marginBottom: 20, fontWeight: 700, fontSize: 14 }}>Métricas por cuenta</div>

      <div style={{ display: 'flex', gap: 12, marginBottom: 28, alignItems: 'flex-end' }}>
        <div style={{ flex: 1, maxWidth: 320 }}>
          <label className="form-label">Cuenta</label>
          <select className="form-select" value={selected} onChange={e => { setSelected(e.target.value); setMetric(null); }}>
            <option value="">Selecciona una cuenta…</option>
            {accounts.map(a => <option key={a._id} value={a._id}>{a.username} ({a.platform})</option>)}
          </select>
        </div>
        <button className="btn btn-primary" onClick={handleFetch} disabled={loading}>{loading ? 'Cargando…' : '◐ Obtener métricas'}</button>
      </div>

      {metric && selectedAcc && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <PlatformBadge platform={selectedAcc.platform} />
            <span style={{ fontWeight: 500 }}>{selectedAcc.username}</span>
            <span style={{ fontSize: 11, color: 'var(--muted)' }}>Actualizado: {new Date(metric.fetchedAt).toLocaleString('es-CO')}</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 14, marginBottom: 28 }}>
            {[
              { label: 'Seguidores', value: metric.followers?.toLocaleString() ?? '—' },
              { label: 'Alcance 24h', value: metric.reach?.toLocaleString() ?? '—' },
              { label: 'Impresiones', value: metric.impressions?.toLocaleString() ?? '—' },
              { label: 'Vistas perfil', value: metric.profileViews?.toLocaleString() ?? '—' },
              { label: 'Posts totales', value: metric.postsCount?.toLocaleString() ?? '—' },
            ].map(m => (
              <div key={m.label} style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 10, padding: '16px 20px' }}>
                <div style={{ fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 8 }}>{m.label}</div>
                <div style={{ fontSize: 28, fontWeight: 800, letterSpacing: -1 }}>{m.value}</div>
              </div>
            ))}
          </div>

          <div style={{ marginTop: 8 }}>
            <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Raw API response</div>
            <pre style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 8, padding: 16, fontSize: 11, color: 'var(--subtle)', overflow: 'auto', maxHeight: 300 }}>
              {JSON.stringify(metric.raw, null, 2)}
            </pre>
          </div>
        </div>
      )}

      {!metric && !loading && (
        <div className="empty" style={{ marginTop: 60 }}>
          <div className="empty-icon">◐</div>
          <div>Selecciona una cuenta y haz clic en "Obtener métricas"</div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/desktop/src/renderer/pages/Metrics.tsx
git commit -m "feat: add Metrics page with per-account stats and raw API response viewer"
```

---

## Task 15: App.tsx — Router principal

**Files:**
- Create: `apps/desktop/src/renderer/App.tsx`
- Create: `apps/desktop/src/renderer/main.tsx`
- Create: `apps/desktop/src/renderer/index.html`

- [ ] **Step 1: Crear App.tsx**

```tsx
// apps/desktop/src/renderer/App.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { Sidebar }   from './components/Sidebar';
import { TopBar }    from './components/TopBar';
import { Toast }     from './components/Toast';
import { Dashboard } from './pages/Dashboard';
import { Clients }   from './pages/Clients';
import { Accounts }  from './pages/Accounts';
import { Posts }     from './pages/Posts';
import { Stories }   from './pages/Stories';
import { Schedule }  from './pages/Schedule';
import { Metrics }   from './pages/Metrics';
import { useToast }  from './hooks/useToast';
import './styles/globals.css';

type Page = 'dashboard' | 'clients' | 'accounts' | 'posts' | 'stories' | 'schedule' | 'metrics';

const PAGE_TITLES: Record<Page, string> = {
  dashboard: 'Dashboard', clients: 'Clientes', accounts: 'Cuentas',
  posts: 'Posts', stories: 'Historias', schedule: 'Programar', metrics: 'Métricas',
};

const inv = <T = unknown>(ch: JuppaoChannel, payload?: unknown) => window.juppao.invoke<T>(ch, payload);

export function App() {
  const [page, setPage] = useState<Page>('dashboard');
  const [clients,  setClients]  = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [posts,    setPosts]    = useState<any[]>([]);
  const [stories,  setStories]  = useState<any[]>([]);
  const { toast, showToast } = useToast();

  const loadAll = useCallback(async () => {
    const [c, a, p, s] = await Promise.all([
      inv<any[]>('clients:list'),
      inv<any[]>('accounts:list'),
      inv<any[]>('posts:list'),
      inv<any[]>('stories:list'),
    ]);
    setClients(c ?? []);
    setAccounts(a ?? []);
    setPosts(p ?? []);
    setStories(s ?? []);
  }, []);

  useEffect(() => { loadAll(); const id = setInterval(loadAll, 15000); return () => clearInterval(id); }, [loadAll]);

  const pendingPosts    = posts.filter(p => p.status === 'pending').length;
  const pendingStories  = stories.filter(s => s.status === 'pending').length;

  const actionLabel: Partial<Record<Page, string>> = { clients: '+ Cliente', accounts: '+ Cuenta', schedule: undefined, metrics: undefined };

  function handleAction() {
    if (page === 'clients') { /* Clients component handles its own modal */ }
    if (page === 'accounts') { /* Accounts component handles its own modal */ }
  }

  return (
    <div id="root" style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      <Sidebar
        currentPage={page}
        onNavigate={setPage}
        badges={{ clients: clients.length, accounts: accounts.length, posts: pendingPosts, stories: pendingStories }}
      />
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <TopBar
          title={PAGE_TITLES[page]}
          onRefresh={loadAll}
          actionLabel={page === 'schedule' ? undefined : undefined}
          onAction={handleAction}
        />
        <div style={{ flex: 1, overflowY: 'auto', padding: 28 }}>
          {page === 'dashboard' && <Dashboard clients={clients} posts={posts} stories={stories} accounts={accounts} />}
          {page === 'clients'   && <Clients  clients={clients} onCreateClient={async name => { await inv('clients:create', { name }); showToast(`Cliente "${name}" creado`); await loadAll(); }} onDeleteClient={async id => { await inv('clients:delete', { id }); await loadAll(); }} showToast={showToast} />}
          {page === 'accounts'  && <Accounts accounts={accounts} clients={clients} onCreateAccount={async p => { await inv('accounts:create', p); showToast('Cuenta guardada (cifrado AES-256)'); await loadAll(); }} onDeleteAccount={async id => { await inv('accounts:delete', { id }); await loadAll(); }} showToast={showToast} />}
          {page === 'posts'     && <Posts posts={posts} accounts={accounts} onUpdate={async (id, d) => { await inv('posts:update', { id, ...d }); await loadAll(); }} onDelete={async id => { await inv('posts:delete', { id }); await loadAll(); }} onPublishNow={async id => inv('posts:publishNow', { id })} showToast={showToast} />}
          {page === 'stories'   && <Stories stories={stories} accounts={accounts} onUpdate={async (id, d) => { await inv('stories:update', { id, ...d }); await loadAll(); }} onDelete={async id => { await inv('stories:delete', { id }); await loadAll(); }} onPublishNow={async id => inv('stories:publishNow', { id })} showToast={showToast} />}
          {page === 'schedule'  && <Schedule accounts={accounts} onCreatePost={async p => { await inv('posts:create', p); await loadAll(); }} onCreateStory={async p => { await inv('stories:create', p); await loadAll(); }} showToast={showToast} />}
          {page === 'metrics'   && <Metrics accounts={accounts} onFetchMetrics={async id => inv('metrics:fetch', { accountId: id })} showToast={showToast} />}
        </div>
      </main>
      <Toast toast={toast} />
    </div>
  );
}
```

- [ ] **Step 2: Crear main.tsx**

```tsx
// apps/desktop/src/renderer/main.tsx
import React from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';

const root = createRoot(document.getElementById('root')!);
root.render(<App />);
```

- [ ] **Step 3: Crear index.html**

```html
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Juppao</title>
  <link href="https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=Syne:wght@400;600;700;800&display=swap" rel="stylesheet" />
</head>
<body>
  <div id="root"></div>
  <script type="module" src="/main.tsx"></script>
</body>
</html>
```

- [ ] **Step 4: Commit**

```bash
git add apps/desktop/src/renderer
git commit -m "feat: add App.tsx router and renderer entry point (main.tsx, index.html)"
```

---

## Task 16: .env.example y configuración final

**Files:**
- Modify: `.env.example`
- Create: `apps/desktop/src/renderer/styles/nav.css` (estilos nav-item que no están en globals)

- [ ] **Step 1: Actualizar .env.example**

```
# === Juppao — Variables de Entorno ===

# MongoDB URI (local o Atlas)
# Local:  mongodb://localhost:27017/juppao
# Atlas:  mongodb+srv://user:pass@cluster.mongodb.net/juppao
MONGODB_URI=mongodb://localhost:27017/juppao

# Clave maestra para cifrado AES-256-GCM (mínimo 32 caracteres)
VAULT_MASTER_KEY=cambia-esta-clave-antes-de-produccion!!

# Redis para el scheduler de publicaciones
REDIS_URL=redis://localhost:6379
```

- [ ] **Step 2: Agregar nav-item CSS a globals.css**

Añadir al final de `apps/desktop/src/renderer/styles/globals.css`:

```css
/* Nav */
.nav-item {
  display: flex; align-items: center; gap: 10px; padding: 8px 10px;
  border-radius: 6px; cursor: pointer; color: var(--subtle);
  transition: all 0.12s; font-size: 13px; border: none; background: none;
  width: 100%; text-align: left; font-family: var(--font-mono);
}
.nav-item:hover { background: var(--bg3); color: var(--text); }
.nav-item.active { background: var(--bg4); color: var(--text); }
.nav-item.active .nav-icon { color: var(--accent); }
.nav-icon { font-size: 15px; width: 18px; text-align: center; }
.nav-badge { margin-left: auto; background: var(--accent); color: #fff; font-size: 10px; padding: 1px 6px; border-radius: 10px; }

/* Platform colors (for inline use) */
.platform.ig { background: rgba(225,48,108,0.15); color: var(--ig); }
.platform.tt { background: rgba(105,201,208,0.15); color: var(--tt); }
.platform.fb { background: rgba(24,119,242,0.15);  color: var(--fb); }

/* Status colors */
.status.pending    { background: rgba(245,158,11,0.15); color: var(--warn); }
.status.done       { background: rgba(34,197,94,0.15);  color: var(--success); }
.status.failed     { background: rgba(239,68,68,0.15);  color: var(--danger); }
.status.publishing { background: rgba(99,102,241,0.15); color: #818cf8; }
```

- [ ] **Step 3: Commit final**

```bash
git add .env.example apps/desktop/src/renderer/styles/globals.css
git commit -m "chore: finalize env config and add nav/platform/status CSS classes"
```

---

## Self-Review

### Cobertura del spec
| Requisito | Tarea |
|-----------|-------|
| App de escritorio únicamente | Task 1 (eliminar mobile/web), Task 8 (Electron main) |
| Migrar a MongoDB | Task 3 (modelos Mongoose), Task 2 (connection string configurable) |
| Renombrar a Juppao | Task 1, Task 8, Task 9, Task 15 |
| Organizar en carpetas | Tasks 2-16 (estructura completa) |
| Posts completos (crear/editar/eliminar) | Tasks 7, 13 |
| Historias (crear/editar/eliminar) | Tasks 5, 7, 13 |
| Métricas | Tasks 5, 7, 14 |
| Cifrado de credenciales | Task 4 |
| Scheduler funcionando | Task 6 |

### Checklist de placeholders
- Ningún "TBD" o "implementar luego" — todo el código está incluido
- Nombres consistentes: `IClient`, `IAccount`, `IPost`, `IStory`, `IMetric` en models; `registerXHandlers()` en IPC; `publish*` en publisher

### Consistencia de tipos
- `accountId` es `Types.ObjectId` en modelos pero `string` en IPC handlers (correcto — IPC serializa a string)
- `JuppaoChannel` definido en `global.d.ts` del renderer, usado en `preload/index.ts` y `hooks/useIpc.ts`

---
