-- ============================================================
-- RAOS ENTERPRISE — 05_users.sql
-- Users (relasi ke Supabase auth.users via auth_user_id)
-- ============================================================

CREATE TABLE users (
  id            UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  auth_user_id  UUID        UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL,
  airport_id    UUID        REFERENCES airports(id) ON DELETE SET NULL,
  role_id       INTEGER     NOT NULL REFERENCES roles(id) DEFAULT 4,
  email         TEXT,
  full_name     TEXT        NOT NULL DEFAULT '',
  phone         TEXT,
  avatar_url    TEXT,
  is_active     BOOLEAN     NOT NULL DEFAULT true,
  last_login    TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT uq_users_email UNIQUE (email)
);

COMMENT ON TABLE  users              IS 'Profil pengguna RAOS — terhubung ke Supabase Auth via auth_user_id';
COMMENT ON COLUMN users.auth_user_id IS 'FK ke auth.users.id — diisi otomatis saat user signup';

CREATE INDEX idx_users_auth_user   ON users(auth_user_id);
CREATE INDEX idx_users_airport     ON users(airport_id);
CREATE INDEX idx_users_role        ON users(role_id);
CREATE INDEX idx_users_is_active   ON users(is_active);
CREATE INDEX idx_users_email       ON users(email);
