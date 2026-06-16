-- ============================================================
-- RAOS ENTERPRISE — 003_users.sql
-- Users (extends Supabase auth.users)
-- ============================================================

CREATE TABLE IF NOT EXISTS users (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email       TEXT,
  full_name   TEXT NOT NULL DEFAULT '',
  role_id     INTEGER NOT NULL REFERENCES roles(id) DEFAULT 4,  -- default: STAFF
  airport_id  UUID REFERENCES airports(id),
  phone       TEXT,
  avatar_url  TEXT,
  is_active   BOOLEAN NOT NULL DEFAULT true,
  last_login  TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE users IS 'Profil pengguna RAOS — extends auth.users Supabase';

CREATE INDEX idx_users_role_id   ON users(role_id);
CREATE INDEX idx_users_airport   ON users(airport_id);
CREATE INDEX idx_users_is_active ON users(is_active);

CREATE TRIGGER trg_users_updated
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

-- ============================================================
-- FUNCTION: auto-create user row on auth signup
-- ============================================================
CREATE OR REPLACE FUNCTION fn_handle_new_auth_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_role_id INTEGER;
  v_airport_id UUID;
BEGIN
  -- Resolve role name → id (default STAFF)
  SELECT id INTO v_role_id
  FROM roles
  WHERE name = COALESCE(NEW.raw_user_meta_data->>'role', 'STAFF')
  LIMIT 1;

  IF v_role_id IS NULL THEN
    SELECT id INTO v_role_id FROM roles WHERE name = 'STAFF' LIMIT 1;
  END IF;

  -- Resolve airport_code → id (optional)
  IF NEW.raw_user_meta_data->>'airport_code' IS NOT NULL THEN
    SELECT id INTO v_airport_id
    FROM airports
    WHERE code = NEW.raw_user_meta_data->>'airport_code'
    LIMIT 1;
  END IF;

  INSERT INTO users (id, email, full_name, role_id, airport_id)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    v_role_id,
    v_airport_id
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION fn_handle_new_auth_user();

-- ============================================================
-- FUNCTION: update last_login
-- ============================================================
CREATE OR REPLACE FUNCTION fn_update_last_login()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE users SET last_login = NOW() WHERE id = NEW.id;
  RETURN NEW;
END;
$$;

-- ============================================================
-- VIEW: user_full (join dengan role + airport)
-- ============================================================
CREATE OR REPLACE VIEW v_user_full AS
SELECT
  u.id,
  u.email,
  u.full_name,
  r.name        AS role,
  r.level       AS role_level,
  r.permissions AS role_permissions,
  a.code        AS airport_code,
  a.name        AS airport_name,
  a.city        AS airport_city,
  u.is_active,
  u.last_login,
  u.created_at
FROM users u
JOIN roles    r ON r.id = u.role_id
LEFT JOIN airports a ON a.id = u.airport_id;
