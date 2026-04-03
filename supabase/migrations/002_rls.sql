-- supabase/migrations/002_rls.sql
-- Ejecutar en: Supabase Dashboard → SQL Editor → New query

-- Activar RLS en todas las tablas
ALTER TABLE companies        ENABLE ROW LEVEL SECURITY;
ALTER TABLE users            ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients          ENABLE ROW LEVEL SECURITY;
ALTER TABLE social_accounts  ENABLE ROW LEVEL SECURITY;
ALTER TABLE scheduled_posts  ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_metrics      ENABLE ROW LEVEL SECURITY;

-- Helper: obtener company_id del usuario autenticado
CREATE OR REPLACE FUNCTION get_user_company_id()
RETURNS UUID AS $$
  SELECT company_id FROM users WHERE id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Helper: obtener role del usuario autenticado
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS TEXT AS $$
  SELECT role FROM users WHERE id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- COMPANIES
CREATE POLICY "users_see_own_company" ON companies
  FOR SELECT USING (id = get_user_company_id());

CREATE POLICY "admins_update_company" ON companies
  FOR UPDATE USING (id = get_user_company_id() AND get_user_role() = 'admin');

-- USERS
CREATE POLICY "users_see_company_members" ON users
  FOR SELECT USING (company_id = get_user_company_id());

CREATE POLICY "admins_manage_users" ON users
  FOR ALL USING (
    company_id = get_user_company_id()
    AND get_user_role() = 'admin'
  );

CREATE POLICY "users_update_own_profile" ON users
  FOR UPDATE USING (id = auth.uid());

-- CLIENTS
CREATE POLICY "users_see_company_clients" ON clients
  FOR SELECT USING (company_id = get_user_company_id());

CREATE POLICY "admins_manage_clients" ON clients
  FOR ALL USING (
    company_id = get_user_company_id()
    AND get_user_role() = 'admin'
  );

-- SOCIAL_ACCOUNTS
CREATE POLICY "users_see_company_accounts" ON social_accounts
  FOR SELECT USING (
    client_id IN (
      SELECT id FROM clients WHERE company_id = get_user_company_id()
    )
  );

CREATE POLICY "admins_manage_accounts" ON social_accounts
  FOR ALL USING (
    get_user_role() = 'admin'
    AND client_id IN (
      SELECT id FROM clients WHERE company_id = get_user_company_id()
    )
  );

-- SCHEDULED_POSTS
CREATE POLICY "users_see_company_posts" ON scheduled_posts
  FOR SELECT USING (
    social_account_id IN (
      SELECT sa.id FROM social_accounts sa
      JOIN clients c ON c.id = sa.client_id
      WHERE c.company_id = get_user_company_id()
    )
  );

CREATE POLICY "users_manage_posts" ON scheduled_posts
  FOR ALL USING (
    social_account_id IN (
      SELECT sa.id FROM social_accounts sa
      JOIN clients c ON c.id = sa.client_id
      WHERE c.company_id = get_user_company_id()
    )
  );

-- POST_METRICS
CREATE POLICY "users_see_metrics" ON post_metrics
  FOR SELECT USING (
    scheduled_post_id IN (
      SELECT sp.id FROM scheduled_posts sp
      JOIN social_accounts sa ON sa.id = sp.social_account_id
      JOIN clients c ON c.id = sa.client_id
      WHERE c.company_id = get_user_company_id()
    )
  );
