-- ============================================================
-- RAOS - RIFIM AIRPORT OPERATING SYSTEM
-- Initial Database Schema
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- AIRPORTS
-- ============================================================
CREATE TABLE airports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code VARCHAR(10) UNIQUE NOT NULL,
  name TEXT NOT NULL,
  city TEXT NOT NULL,
  province TEXT,
  latitude DECIMAL(10,8) NOT NULL,
  longitude DECIMAL(11,8) NOT NULL,
  partner TEXT,
  status TEXT DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'PLANNED', 'INACTIVE')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- PROFILES (extends Supabase auth.users)
-- ============================================================
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT NOT NULL,
  role TEXT DEFAULT 'STAFF' CHECK (role IN ('SUPER_ADMIN', 'DIRECTOR', 'AIRPORT_COORDINATOR', 'STAFF', 'DRIVER')),
  airport_id UUID REFERENCES airports(id),
  phone TEXT,
  avatar_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- DRIVERS
-- ============================================================
CREATE TABLE drivers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  airport_id UUID NOT NULL REFERENCES airports(id),
  driver_id TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  nik VARCHAR(20),
  phone TEXT NOT NULL,
  license_number TEXT,
  license_expiry DATE,
  vehicle_type TEXT,
  vehicle_number TEXT,
  status TEXT DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE', 'SUSPENDED', 'ON_DUTY', 'OFF_DUTY')),
  type TEXT DEFAULT 'INTERNAL' CHECK (type IN ('INTERNAL', 'EXTERNAL')),
  kpi_score DECIMAL(5,2) DEFAULT 0,
  notes TEXT,
  photo_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- DRIVER LOCATIONS (realtime)
-- ============================================================
CREATE TABLE driver_locations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  driver_id UUID NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
  latitude DECIMAL(10,8) NOT NULL,
  longitude DECIMAL(11,8) NOT NULL,
  speed DECIMAL(6,2),
  heading DECIMAL(5,2),
  accuracy DECIMAL(6,2),
  is_online BOOLEAN DEFAULT true,
  recorded_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- PICKUP QUEUES
-- ============================================================
CREATE TABLE pickup_queues (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  airport_id UUID NOT NULL REFERENCES airports(id),
  driver_id UUID NOT NULL REFERENCES drivers(id),
  queue_number INTEGER NOT NULL,
  status TEXT DEFAULT 'WAITING' CHECK (status IN ('WAITING', 'SERVING', 'DONE', 'VIOLATION')),
  check_in_time TIMESTAMPTZ DEFAULT NOW(),
  serve_time TIMESTAMPTZ,
  done_time TIMESTAMPTZ,
  date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- STAFF
-- ============================================================
CREATE TABLE staff (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  airport_id UUID NOT NULL REFERENCES airports(id),
  staff_id TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  nik VARCHAR(20),
  phone TEXT,
  position TEXT NOT NULL,
  department TEXT,
  shift TEXT,
  status TEXT DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE', 'LEAVE')),
  join_date DATE,
  salary_base DECIMAL(15,2) DEFAULT 0,
  photo_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- STAFF ATTENDANCE
-- ============================================================
CREATE TABLE staff_attendance (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  staff_id UUID NOT NULL REFERENCES staff(id),
  airport_id UUID NOT NULL REFERENCES airports(id),
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  check_in TIMESTAMPTZ,
  check_out TIMESTAMPTZ,
  check_in_lat DECIMAL(10,8),
  check_in_lng DECIMAL(11,8),
  check_out_lat DECIMAL(10,8),
  check_out_lng DECIMAL(11,8),
  status TEXT DEFAULT 'ABSENT' CHECK (status IN ('PRESENT', 'ABSENT', 'LATE', 'SICK', 'LEAVE')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (staff_id, date)
);

-- ============================================================
-- STAFF SCHEDULES
-- ============================================================
CREATE TABLE staff_schedules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  staff_id UUID NOT NULL REFERENCES staff(id),
  airport_id UUID NOT NULL REFERENCES airports(id),
  shift_name TEXT NOT NULL,
  shift_start TIME NOT NULL,
  shift_end TIME NOT NULL,
  work_days TEXT[] DEFAULT '{}',
  effective_from DATE NOT NULL DEFAULT CURRENT_DATE,
  effective_to DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- PAYROLL
-- ============================================================
CREATE TABLE payroll (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  staff_id UUID NOT NULL REFERENCES staff(id),
  airport_id UUID NOT NULL REFERENCES airports(id),
  period_month INTEGER NOT NULL CHECK (period_month BETWEEN 1 AND 12),
  period_year INTEGER NOT NULL,
  salary_base DECIMAL(15,2) DEFAULT 0,
  overtime_hours DECIMAL(6,2) DEFAULT 0,
  overtime_pay DECIMAL(15,2) DEFAULT 0,
  bonus DECIMAL(15,2) DEFAULT 0,
  incentive DECIMAL(15,2) DEFAULT 0,
  deductions DECIMAL(15,2) DEFAULT 0,
  kasbon_deduction DECIMAL(15,2) DEFAULT 0,
  absence_deduction DECIMAL(15,2) DEFAULT 0,
  total_gross DECIMAL(15,2) GENERATED ALWAYS AS (salary_base + overtime_pay + bonus + incentive) STORED,
  total_net DECIMAL(15,2) GENERATED ALWAYS AS (salary_base + overtime_pay + bonus + incentive - deductions - kasbon_deduction - absence_deduction) STORED,
  status TEXT DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'PROCESSED', 'PAID')),
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (staff_id, period_month, period_year)
);

-- ============================================================
-- KASBON (Cash Advance)
-- ============================================================
CREATE TABLE kasbon (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  staff_id UUID NOT NULL REFERENCES staff(id),
  airport_id UUID NOT NULL REFERENCES airports(id),
  amount DECIMAL(15,2) NOT NULL,
  remaining DECIMAL(15,2) NOT NULL,
  monthly_installment DECIMAL(15,2) NOT NULL,
  purpose TEXT,
  date DATE DEFAULT CURRENT_DATE,
  status TEXT DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'PAID')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- LEAVE REQUESTS (Cuti)
-- ============================================================
CREATE TABLE leave_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  staff_id UUID NOT NULL REFERENCES staff(id),
  airport_id UUID NOT NULL REFERENCES airports(id),
  type TEXT NOT NULL CHECK (type IN ('ANNUAL', 'SICK', 'EMERGENCY', 'MATERNITY', 'UNPAID')),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  days INTEGER NOT NULL,
  reason TEXT,
  status TEXT DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')),
  approved_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- FINANCE - INCOME
-- ============================================================
CREATE TABLE finance_income (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  airport_id UUID NOT NULL REFERENCES airports(id),
  category TEXT NOT NULL,
  amount DECIMAL(15,2) NOT NULL,
  description TEXT,
  date DATE DEFAULT CURRENT_DATE,
  source TEXT,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- FINANCE - EXPENSE
-- ============================================================
CREATE TABLE finance_expense (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  airport_id UUID NOT NULL REFERENCES airports(id),
  category TEXT NOT NULL,
  amount DECIMAL(15,2) NOT NULL,
  description TEXT,
  date DATE DEFAULT CURRENT_DATE,
  vendor TEXT,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- FINANCE - BILLS / TAGIHAN
-- ============================================================
CREATE TABLE finance_bills (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  airport_id UUID NOT NULL REFERENCES airports(id),
  title TEXT NOT NULL,
  amount DECIMAL(15,2) NOT NULL,
  due_date DATE NOT NULL,
  status TEXT DEFAULT 'UNPAID' CHECK (status IN ('UNPAID', 'PAID', 'OVERDUE')),
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- NOTIFICATIONS
-- ============================================================
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id),
  airport_id UUID REFERENCES airports(id),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  type TEXT DEFAULT 'INFO',
  is_read BOOLEAN DEFAULT false,
  data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- ACTIVITY LOGS
-- ============================================================
CREATE TABLE activity_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id),
  airport_id UUID REFERENCES airports(id),
  action TEXT NOT NULL,
  entity TEXT NOT NULL,
  entity_id UUID,
  changes JSONB,
  ip_address TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX idx_drivers_airport ON drivers(airport_id);
CREATE INDEX idx_drivers_status ON drivers(status);
CREATE INDEX idx_driver_locations_driver ON driver_locations(driver_id);
CREATE INDEX idx_driver_locations_recorded ON driver_locations(recorded_at DESC);
CREATE INDEX idx_queues_airport_date ON pickup_queues(airport_id, date);
CREATE INDEX idx_queues_status ON pickup_queues(status);
CREATE INDEX idx_staff_airport ON staff(airport_id);
CREATE INDEX idx_attendance_date ON staff_attendance(date);
CREATE INDEX idx_attendance_staff ON staff_attendance(staff_id);
CREATE INDEX idx_payroll_period ON payroll(period_year, period_month);
CREATE INDEX idx_activity_logs_created ON activity_logs(created_at DESC);
CREATE INDEX idx_notifications_user ON notifications(user_id, is_read);

-- ============================================================
-- TRIGGERS - updated_at
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_airports_updated BEFORE UPDATE ON airports FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_drivers_updated BEFORE UPDATE ON drivers FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_staff_updated BEFORE UPDATE ON staff FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_payroll_updated BEFORE UPDATE ON payroll FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- TRIGGER - Auto create profile on signup
-- ============================================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    COALESCE(NEW.raw_user_meta_data->>'role', 'STAFF')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
