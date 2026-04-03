// lib/types.ts

export type Platform = 'instagram' | 'facebook' | 'tiktok'
export type UserRole = 'admin' | 'custom'
export type PostStatus = 'draft' | 'scheduled' | 'publishing' | 'published' | 'failed'
export type ContentType = 'post' | 'reel' | 'story' | 'video'

export interface UserPermissions {
  clients?: string[]
  can_publish?: boolean
  can_schedule?: boolean
  can_view_analytics?: boolean
  can_manage_accounts?: boolean
}

export interface Company {
  id: string
  name: string
  owner_id: string | null
  plan: string
  created_at: string
}

export interface User {
  id: string
  company_id: string
  email: string
  full_name: string | null
  role: UserRole
  permissions: UserPermissions
  created_at: string
}

export interface Client {
  id: string
  company_id: string
  name: string
  logo_url: string | null
  created_at: string
}

export interface SocialAccount {
  id: string
  client_id: string
  platform: Platform
  username: string
  last_sync: string | null
  is_active: boolean
  added_by_id: string | null
  created_at: string
}

export interface SocialAccountWithClient extends SocialAccount {
  client: Pick<Client, 'id' | 'name'> | null
}

export interface ScheduledPost {
  id: string
  social_account_id: string
  content_type: ContentType
  caption: string | null
  media_url: string | null
  scheduled_at: string
  status: PostStatus
  error_msg: string | null
  created_by_id: string | null
  created_at: string
}

export interface PostMetrics {
  id: string
  scheduled_post_id: string
  likes: number
  comments: number
  shares: number
  reach: number
  engagement_rate: number
  fetched_at: string
}

export type Database = {
  public: {
    Tables: {
      companies: {
        Row: Company
        Insert: Omit<Company, 'id' | 'created_at'>
        Update: Partial<Omit<Company, 'id' | 'created_at'>>
      }
      users: {
        Row: User
        Insert: Omit<User, 'created_at'>
        Update: Partial<Omit<User, 'id' | 'created_at'>>
      }
      clients: {
        Row: Client
        Insert: Omit<Client, 'id' | 'created_at'>
        Update: Partial<Omit<Client, 'id' | 'created_at'>>
      }
      social_accounts: {
        Row: SocialAccount
        Insert: Omit<SocialAccount, 'id' | 'created_at'>
        Update: Partial<Omit<SocialAccount, 'id' | 'created_at'>>
      }
      scheduled_posts: {
        Row: ScheduledPost
        Insert: Omit<ScheduledPost, 'id' | 'created_at'>
        Update: Partial<Omit<ScheduledPost, 'id' | 'created_at'>>
      }
      post_metrics: {
        Row: PostMetrics
        Insert: Omit<PostMetrics, 'id'>
        Update: Partial<Omit<PostMetrics, 'id'>>
      }
    }
  }
}
