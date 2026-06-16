-- ============================================================
-- RAOS - Row Level Security (RLS) Policies
-- ============================================================

-- Helper function: get current user role
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS TEXT AS $$
  SELECT role FROM profiles WHERE id = auth.uid();
$$ LANGUAGE SQL SECURITY DEFINER;

-- Helper function: get current user airport
CREATE OR REPLACE FUNCTION get_user_airport()
RETURNS UUID AS $$
  SELECT airport_id FROM profiles WHERE id = auth.uid();
$$ LANGUAGE SQL SECURITY DEFINER;

-- Helper function: is super admin or director
CREATE OR REPLACE FUNCTION is_national_admin()
RETURNS BOOLEAN AS $$
  SELECT role IN ('SUPER_ADMIN', 'DIRECTOR') FROM profiles WHERE id = auth.uid();
$$ LANGUAGE SQL SECURITY DEFINER;

-- Enable RLS
ALTER TABLE airports ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE driver_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE pickup_queues ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll ENABLE ROW LEVEL SECURITY;
ALTER TABLE kasbon ENABLE ROW LEVEL SECURITY;
ALTER TABLE leave_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE finance_income ENABLE ROW LEVEL SECURITY;
ALTER TABLE finance_expense ENABLE ROW LEVEL SECURITY;
ALTER TABLE finance_bills ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- AIRPORTS: all authenticated users can read
-- ============================================================
CREATE POLICY "airports_read_all" ON airports
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "airports_write_superadmin" ON airports
  FOR ALL TO authenticated
  USING (is_national_admin())
  WITH CHECK (is_national_admin());

-- ============================================================
-- PROFILES: users can read own, admins can read all
-- ============================================================
CREATE POLICY "profiles_read_own" ON profiles
  FOR SELECT TO authenticated
  USING (id = auth.uid() OR is_national_admin() OR (role = 'AIRPORT_COORDINATOR' AND airport_id = get_user_airport()));

CREATE POLICY "profiles_update_own" ON profiles
  FOR UPDATE TO authenticated
  USING (id = auth.uid() OR is_national_admin());

CREATE POLICY "profiles_insert_admin" ON profiles
  FOR INSERT TO authenticated
  WITH CHECK (is_national_admin());

-- ============================================================
-- DRIVERS: airport staff see own airport, admins see all
-- ============================================================
CREATE POLICY "drivers_read" ON drivers
  FOR SELECT TO authenticated
  USING (is_national_admin() OR airport_id = get_user_airport());

CREATE POLICY "drivers_write" ON drivers
  FOR ALL TO authenticated
  USING (is_national_admin() OR airport_id = get_user_airport())
  WITH CHECK (is_national_admin() OR airport_id = get_user_airport());

-- ============================================================
-- DRIVER LOCATIONS
-- ============================================================
CREATE POLICY "driver_locations_read" ON driver_locations
  FOR SELECT TO authenticated
  USING (
    is_national_admin() OR
    EXISTS (SELECT 1 FROM drivers d WHERE d.id = driver_id AND d.airport_id = get_user_airport())
  );

CREATE POLICY "driver_locations_insert" ON driver_locations
  FOR INSERT TO authenticated WITH CHECK (true);

-- ============================================================
-- PICKUP QUEUES
-- ============================================================
CREATE POLICY "queues_read" ON pickup_queues
  FOR SELECT TO authenticated
  USING (is_national_admin() OR airport_id = get_user_airport());

CREATE POLICY "queues_write" ON pickup_queues
  FOR ALL TO authenticated
  USING (is_national_admin() OR airport_id = get_user_airport())
  WITH CHECK (is_national_admin() OR airport_id = get_user_airport());

-- ============================================================
-- STAFF
-- ============================================================
CREATE POLICY "staff_read" ON staff
  FOR SELECT TO authenticated
  USING (is_national_admin() OR airport_id = get_user_airport());

CREATE POLICY "staff_write" ON staff
  FOR ALL TO authenticated
  USING (is_national_admin() OR airport_id = get_user_airport())
  WITH CHECK (is_national_admin() OR airport_id = get_user_airport());

-- ============================================================
-- ATTENDANCE
-- ============================================================
CREATE POLICY "attendance_read" ON staff_attendance
  FOR SELECT TO authenticated
  USING (is_national_admin() OR airport_id = get_user_airport() OR staff_id IN (SELECT id FROM staff WHERE id IN (SELECT id FROM staff WHERE airport_id = get_user_airport())));

CREATE POLICY "attendance_write" ON staff_attendance
  FOR ALL TO authenticated
  USING (is_national_admin() OR airport_id = get_user_airport())
  WITH CHECK (is_national_admin() OR airport_id = get_user_airport());

-- ============================================================
-- PAYROLL - only coordinator+ can see
-- ============================================================
CREATE POLICY "payroll_read" ON payroll
  FOR SELECT TO authenticated
  USING (
    is_national_admin() OR
    (get_user_role() = 'AIRPORT_COORDINATOR' AND airport_id = get_user_airport())
  );

CREATE POLICY "payroll_write" ON payroll
  FOR ALL TO authenticated
  USING (is_national_admin() OR (get_user_role() = 'AIRPORT_COORDINATOR' AND airport_id = get_user_airport()))
  WITH CHECK (is_national_admin() OR (get_user_role() = 'AIRPORT_COORDINATOR' AND airport_id = get_user_airport()));

-- ============================================================
-- KASBON
-- ============================================================
CREATE POLICY "kasbon_read" ON kasbon
  FOR SELECT TO authenticated
  USING (is_national_admin() OR airport_id = get_user_airport());

CREATE POLICY "kasbon_write" ON kasbon
  FOR ALL TO authenticated
  USING (is_national_admin() OR airport_id = get_user_airport())
  WITH CHECK (is_national_admin() OR airport_id = get_user_airport());

-- ============================================================
-- FINANCE
-- ============================================================
CREATE POLICY "income_read" ON finance_income
  FOR SELECT TO authenticated
  USING (is_national_admin() OR airport_id = get_user_airport());

CREATE POLICY "income_write" ON finance_income
  FOR ALL TO authenticated
  USING (is_national_admin() OR airport_id = get_user_airport())
  WITH CHECK (is_national_admin() OR airport_id = get_user_airport());

CREATE POLICY "expense_read" ON finance_expense
  FOR SELECT TO authenticated
  USING (is_national_admin() OR airport_id = get_user_airport());

CREATE POLICY "expense_write" ON finance_expense
  FOR ALL TO authenticated
  USING (is_national_admin() OR airport_id = get_user_airport())
  WITH CHECK (is_national_admin() OR airport_id = get_user_airport());

CREATE POLICY "bills_read" ON finance_bills
  FOR SELECT TO authenticated
  USING (is_national_admin() OR airport_id = get_user_airport());

CREATE POLICY "bills_write" ON finance_bills
  FOR ALL TO authenticated
  USING (is_national_admin() OR airport_id = get_user_airport())
  WITH CHECK (is_national_admin() OR airport_id = get_user_airport());

-- ============================================================
-- NOTIFICATIONS: users see own notifications
-- ============================================================
CREATE POLICY "notifications_read" ON notifications
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR is_national_admin());

CREATE POLICY "notifications_update" ON notifications
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

-- ============================================================
-- ACTIVITY LOGS: admins see all
-- ============================================================
CREATE POLICY "logs_read" ON activity_logs
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR is_national_admin());

CREATE POLICY "logs_insert" ON activity_logs
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
