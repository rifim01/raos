-- ============================================================
-- RAOS ENTERPRISE — 04_roles.sql
-- Role & Permission system
-- ============================================================

CREATE TABLE roles (
  id          SERIAL      PRIMARY KEY,
  name        role_name   NOT NULL,
  label       TEXT        NOT NULL,
  level       SMALLINT    NOT NULL DEFAULT 1
                CHECK (level BETWEEN 1 AND 5),
  description TEXT,
  permissions JSONB       NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT uq_roles_name UNIQUE (name)
);

COMMENT ON TABLE  roles       IS 'Definisi role RBAC — level 5=SUPER_ADMIN tertinggi';
COMMENT ON COLUMN roles.level IS '5=SUPER_ADMIN, 4=DIRECTOR, 3=AIRPORT_COORDINATOR, 2=STAFF, 1=DRIVER';

CREATE INDEX idx_roles_name  ON roles(name);
CREATE INDEX idx_roles_level ON roles(level);
