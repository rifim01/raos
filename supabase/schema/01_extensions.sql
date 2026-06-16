-- ============================================================
-- RAOS ENTERPRISE — 01_extensions.sql
-- PT RIFIM GEMILANG | PostgreSQL 17 / Supabase Production
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";    -- uuid_generate_v4()
CREATE EXTENSION IF NOT EXISTS "pgcrypto";     -- gen_random_uuid(), crypt()
CREATE EXTENSION IF NOT EXISTS "vector";       -- pgvector — embedding AI
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements"; -- query performance monitoring
