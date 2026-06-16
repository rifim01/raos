-- ============================================================
-- RAOS ENTERPRISE — 002_roles.sql
-- Role-Based Access Control (RBAC)
-- ============================================================

CREATE TABLE IF NOT EXISTS roles (
  id          SERIAL PRIMARY KEY,
  name        TEXT UNIQUE NOT NULL,
  label       TEXT NOT NULL,
  description TEXT,
  level       INTEGER NOT NULL DEFAULT 0,  -- higher = more access
  permissions JSONB NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE roles IS 'Definisi role dan permission untuk RBAC';
COMMENT ON COLUMN roles.level IS '5=SUPER_ADMIN, 4=DIRECTOR, 3=AIRPORT_COORDINATOR, 2=STAFF, 1=DRIVER';

-- ============================================================
-- SEED: 5 roles
-- ============================================================
INSERT INTO roles (name, label, level, description, permissions) VALUES
(
  'SUPER_ADMIN',
  'Super Administrator',
  5,
  'Full access ke semua data seluruh bandara',
  '{"all": true}'
),
(
  'DIRECTOR',
  'Direktur',
  4,
  'Read-only nasional — semua bandara, semua modul',
  '{
    "airports": {"read": true},
    "staff": {"read": true},
    "drivers": {"read": true},
    "attendance": {"read": true},
    "payroll": {"read": true},
    "finance": {"read": true},
    "reports": {"read": true}
  }'
),
(
  'AIRPORT_COORDINATOR',
  'Koordinator Bandara',
  3,
  'Full CRUD untuk bandara sendiri',
  '{
    "staff": {"read": true, "write": true},
    "drivers": {"read": true, "write": true},
    "attendance": {"read": true},
    "payroll": {"read": true, "write": true},
    "finance": {"read": true, "write": true},
    "queue": {"read": true, "write": true}
  }'
),
(
  'STAFF',
  'Staff',
  2,
  'Akses data pribadi + absensi',
  '{
    "attendance": {"read": true, "write": true},
    "schedule": {"read": true},
    "payroll": {"read": true, "own_only": true}
  }'
),
(
  'DRIVER',
  'Driver',
  1,
  'Akses antrian dan lokasi pribadi',
  '{
    "queue": {"read": true},
    "location": {"write": true}
  }'
)
ON CONFLICT (name) DO UPDATE
  SET label = EXCLUDED.label,
      level = EXCLUDED.level,
      description = EXCLUDED.description,
      permissions = EXCLUDED.permissions;
