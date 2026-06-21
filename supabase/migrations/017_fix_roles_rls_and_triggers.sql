-- ================================================================
-- RAOS ENTERPRISE — 017_fix_roles_rls_and_triggers.sql
-- Fix: roles table RLS (root cause of all users showing as STAFF)
-- Fix: Remove duplicate auth trigger
-- Fix: Ensure airports readable by authenticated users
-- Applied: 2026-06-22
-- ================================================================

-- FIX 1: roles table had RLS enabled but NO SELECT policy →
-- Supabase JS client join roles(name,level) returned null for
-- every user → everyone defaulted to STAFF (role_level 2)
CREATE POLICY "roles_read_authenticated"
  ON roles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "roles_read_anon"
  ON roles FOR SELECT
  TO anon
  USING (true);

-- FIX 2: Remove the OLD duplicate trigger on auth.users.
-- Keep: trg_on_auth_user_created → fn_handle_new_auth_user (users table)
-- Drop: on_auth_user_created → handle_new_user (profiles table — redundant)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- FIX 3: Ensure airports readable (needed for getCurrentUser() join)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'airports' AND policyname = 'airports_read_authenticated'
  ) THEN
    CREATE POLICY "airports_read_authenticated"
      ON airports FOR SELECT TO authenticated USING (true);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'airports' AND policyname = 'airports_read_anon'
  ) THEN
    CREATE POLICY "airports_read_anon"
      ON airports FOR SELECT TO anon USING (true);
  END IF;
END $$;

-- FIX 4: Ensure Bobby is DIRECTOR (defensive, already correct)
UPDATE public.users
SET role_id = (SELECT id FROM roles WHERE name = 'DIRECTOR' LIMIT 1)
WHERE email = 'bobby@rifim.co.id'
  AND role_id != (SELECT id FROM roles WHERE name = 'DIRECTOR' LIMIT 1);
