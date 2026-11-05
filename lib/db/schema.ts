// lib/db/schema.ts
// Schema de Drizzle para PostgreSQL. Los nombres de propiedad son snake_case a
// propósito: coinciden con los tipos de lib/types.ts que consume toda la UI.
import { pgTable, text, integer, boolean, jsonb, doublePrecision } from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'
import type { UserPermissions } from '@/lib/types'

const uuid = () => crypto.randomUUID()
const nowIso = () => new Date().toISOString()

export const companies = pgTable('companies', {
  id: text('id').primaryKey().$defaultFn(uuid),
  name: text('name').notNull(),
  owner_id: text('owner_id'),
  plan: text('plan').notNull().default('free'),
  created_at: text('created_at').notNull().$defaultFn(nowIso),
})

export const users = pgTable('users', {
  id: text('id').primaryKey().$defaultFn(uuid),
  company_id: text('company_id')
    .notNull()
    .references(() => companies.id, { onDelete: 'cascade' }),
  email: text('email').notNull().unique(),
  password_hash: text('password_hash').notNull(),
  full_name: text('full_name'),
  role: text('role', { enum: ['admin', 'custom'] }).notNull().default('custom'),
  permissions: jsonb('permissions')
    .$type<UserPermissions>()
    .notNull()
    .default({}),
  created_at: text('created_at').notNull().$defaultFn(nowIso),
})

export const clients = pgTable('clients', {
  id: text('id').primaryKey().$defaultFn(uuid),
  company_id: text('company_id')
    .notNull()
    .references(() => companies.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  logo_url: text('logo_url'),
  created_at: text('created_at').notNull().$defaultFn(nowIso),
})

export const social_accounts = pgTable('social_accounts', {
  id: text('id').primaryKey().$defaultFn(uuid),
  client_id: text('client_id')
    .notNull()
    .references(() => clients.id, { onDelete: 'cascade' }),
  platform: text('platform', { enum: ['instagram', 'facebook', 'tiktok'] }).notNull(),
  username: text('username').notNull(),
  credentials_enc: text('credentials_enc'),
  access_token_enc: text('access_token_enc'),
  last_sync: text('last_sync'),
  is_active: boolean('is_active').notNull().default(true),
  added_by_id: text('added_by_id'),
  created_at: text('created_at').notNull().$defaultFn(nowIso),
})

export const scheduled_posts = pgTable('scheduled_posts', {
  id: text('id').primaryKey().$defaultFn(uuid),
  social_account_id: text('social_account_id')
    .notNull()
    .references(() => social_accounts.id, { onDelete: 'cascade' }),
  content_type: text('content_type', { enum: ['post', 'reel', 'story', 'video'] }).notNull(),
  caption: text('caption'),
  media_url: text('media_url'),
  scheduled_at: text('scheduled_at').notNull(),
  status: text('status', {
    enum: ['draft', 'scheduled', 'publishing', 'published', 'failed'],
  })
    .notNull()
    .default('scheduled'),
  error_msg: text('error_msg'),
  created_by_id: text('created_by_id'),
  created_at: text('created_at').notNull().$defaultFn(nowIso),
})

export const post_metrics = pgTable('post_metrics', {
  id: text('id').primaryKey().$defaultFn(uuid),
  scheduled_post_id: text('scheduled_post_id')
    .notNull()
    .references(() => scheduled_posts.id, { onDelete: 'cascade' }),
  likes: integer('likes').notNull().default(0),
  comments: integer('comments').notNull().default(0),
  shares: integer('shares').notNull().default(0),
  reach: integer('reach').notNull().default(0),
  engagement_rate: doublePrecision('engagement_rate').notNull().default(0),
  fetched_at: text('fetched_at').notNull().$defaultFn(nowIso),
})

// Relaciones para la API relacional de Drizzle (db.query.*.findMany({ with }))
export const clientsRelations = relations(clients, ({ many }) => ({
  social_accounts: many(social_accounts),
}))

export const socialAccountsRelations = relations(social_accounts, ({ one, many }) => ({
  client: one(clients, {
    fields: [social_accounts.client_id],
    references: [clients.id],
  }),
  scheduled_posts: many(scheduled_posts),
}))

export const scheduledPostsRelations = relations(scheduled_posts, ({ one, many }) => ({
  social_account: one(social_accounts, {
    fields: [scheduled_posts.social_account_id],
    references: [social_accounts.id],
  }),
  post_metrics: many(post_metrics),
}))

export const postMetricsRelations = relations(post_metrics, ({ one }) => ({
  scheduled_post: one(scheduled_posts, {
    fields: [post_metrics.scheduled_post_id],
    references: [scheduled_posts.id],
  }),
}))

export const usersRelations = relations(users, ({ one }) => ({
  company: one(companies, {
    fields: [users.company_id],
    references: [companies.id],
  }),
}))
