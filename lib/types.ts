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
        Insert: {
          id?: string
          name: string
          owner_id?: string | null
          plan: string
        }
        Update: {
          id?: string
          name?: string
          owner_id?: string | null
          plan?: string
        }
      }
      users: {
        Row: User
        Insert: {
          id: string
          company_id: string
          email: string
          full_name?: string | null
          role: UserRole
          permissions?: UserPermissions
        }
        Update: {
          id?: string
          company_id?: string
          email?: string
          full_name?: string | null
          role?: UserRole
          permissions?: UserPermissions
        }
      }
      clients: {
        Row: Client
        Insert: {
          company_id: string
          name: string
          logo_url?: string | null
        }
        Update: {
          company_id?: string
          name?: string
          logo_url?: string | null
        }
      }
      social_accounts: {
        Row: SocialAccount
        Insert: {
          client_id: string
          platform: Platform
          username: string
          last_sync?: string | null
          is_active?: boolean
          added_by_id?: string | null
        }
        Update: {
          client_id?: string
          platform?: Platform
          username?: string
          last_sync?: string | null
          is_active?: boolean
          added_by_id?: string | null
        }
      }
      scheduled_posts: {
        Row: ScheduledPost
        Insert: {
          social_account_id: string
          content_type: ContentType
          caption?: string | null
          media_url?: string | null
          scheduled_at: string
          status?: PostStatus
          error_msg?: string | null
          created_by_id?: string | null
        }
        Update: {
          social_account_id?: string
          content_type?: ContentType
          caption?: string | null
          media_url?: string | null
          scheduled_at?: string
          status?: PostStatus
          error_msg?: string | null
          created_by_id?: string | null
        }
      }
      post_metrics: {
        Row: PostMetrics
        Insert: {
          scheduled_post_id: string
          likes: number
          comments: number
          shares: number
          reach: number
          engagement_rate: number
          fetched_at: string
        }
        Update: {
          scheduled_post_id?: string
          likes?: number
          comments?: number
          shares?: number
          reach?: number
          engagement_rate?: number
          fetched_at?: string
        }
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
  }
}
