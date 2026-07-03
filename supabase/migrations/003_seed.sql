-- supabase/migrations/003_seed.sql
-- Ejecutar DESPUÉS de crear el primer usuario en Authentication → Users
-- Reemplazar los valores entre < > con los reales

-- Paso 1: Crear primero el usuario en Supabase Auth:
--   Dashboard → Authentication → Users → Add user
--   Email: tu@email.com | Password: (la que quieras) | Auto Confirm: ON
--   Copia el UUID del usuario creado

-- Paso 2: Reemplazar y ejecutar:
DO $$
DECLARE
  v_user_id UUID := '<PEGAR-UUID-DEL-USUARIO-AQUI>';
  v_company_id UUID;
BEGIN
  INSERT INTO companies (name, plan)
  VALUES ('<NOMBRE-DE-TU-AGENCIA>', 'free')
  RETURNING id INTO v_company_id;

  INSERT INTO users (id, company_id, email, full_name, role)
  VALUES (
    v_user_id,
    v_company_id,
    '<tu@email.com>',
    '<Tu Nombre>',
    'admin'
  );

  UPDATE companies SET owner_id = v_user_id WHERE id = v_company_id;
END $$;

-- Verificar:
-- SELECT u.email, u.role, c.name as company FROM users u JOIN companies c ON c.id = u.company_id;
