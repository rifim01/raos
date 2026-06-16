-- ============================================================
-- RAOS ENTERPRISE — 17_seed.sql
-- Seed data: Airports + Roles
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- SEED: airports (7 bandara)
-- ────────────────────────────────────────────────────────────
INSERT INTO airports (code, name, city, province, partner, latitude, longitude, radius_meter, status) VALUES
  ('DJB001', 'Bandara Sultan Thaha',
   'Jambi', 'Jambi', 'Angkasa Pura II',
   -1.63824, 103.64440, 500, 'ACTIVE'),

  ('PKU001', 'Bandara Sultan Syarif Kasim II',
   'Pekanbaru', 'Riau', 'Angkasa Pura II',
   0.46073, 101.44507, 500, 'ACTIVE'),

  ('BTH001', 'Bandara Internasional Hang Nadim',
   'Batam', 'Kepulauan Riau', 'BP Batam',
   1.12118, 104.11863, 500, 'ACTIVE'),

  ('BPN001', 'Bandara Sultan Aji Muhammad Sulaiman Sepinggan',
   'Balikpapan', 'Kalimantan Timur', 'Angkasa Pura I',
   -1.26827, 116.89456, 500, 'ACTIVE'),

  ('MDC001', 'Bandara Sam Ratulangi',
   'Manado', 'Sulawesi Utara', 'Angkasa Pura I',
   1.54932, 124.92606, 500, 'ACTIVE'),

  ('UPG001', 'Bandara Sultan Hasanuddin',
   'Makassar', 'Sulawesi Selatan', 'Angkasa Pura I',
   -5.06152, 119.55404, 500, 'ACTIVE'),

  ('CGK001', 'Bandara Internasional Soekarno-Hatta',
   'Tangerang', 'Banten', 'Angkasa Pura II',
   -6.12566, 106.65592, 500, 'PLANNED')

ON CONFLICT (code) DO UPDATE SET
  name        = EXCLUDED.name,
  city        = EXCLUDED.city,
  province    = EXCLUDED.province,
  partner     = EXCLUDED.partner,
  latitude    = EXCLUDED.latitude,
  longitude   = EXCLUDED.longitude,
  radius_meter = EXCLUDED.radius_meter,
  status      = EXCLUDED.status;

-- ────────────────────────────────────────────────────────────
-- SEED: roles (5 role)
-- ────────────────────────────────────────────────────────────
INSERT INTO roles (name, label, level, description, permissions) VALUES

('SUPER_ADMIN', 'Super Administrator', 5,
 'Full access ke semua data dan konfigurasi sistem',
 '{"all": true}'),

('DIRECTOR', 'Direktur', 4,
 'Read-only nasional — semua bandara, semua modul',
 '{"airports":{"read":true},"staff":{"read":true},"drivers":{"read":true},
   "attendance":{"read":true},"payroll":{"read":true},"finance":{"read":true},
   "reports":{"read":true},"ai":{"read":true}}'),

('AIRPORT_COORDINATOR', 'Koordinator Bandara', 3,
 'Full CRUD untuk bandara sendiri',
 '{"staff":{"read":true,"write":true},"drivers":{"read":true,"write":true},
   "attendance":{"read":true},"payroll":{"read":true,"write":true},
   "finance":{"read":true,"write":true},"queue":{"read":true,"write":true},
   "schedule":{"read":true,"write":true}}'),

('STAFF', 'Staff', 2,
 'Akses data pribadi, absensi, dan jadwal',
 '{"attendance":{"read":true,"write":true},"schedule":{"read":true},
   "payroll":{"read":true,"own_only":true},"notifications":{"read":true}}'),

('DRIVER', 'Driver', 1,
 'Akses antrian dan update lokasi GPS',
 '{"queue":{"read":true,"register":true},"location":{"write":true},
   "notifications":{"read":true}}')

ON CONFLICT (name) DO UPDATE SET
  label       = EXCLUDED.label,
  level       = EXCLUDED.level,
  description = EXCLUDED.description,
  permissions = EXCLUDED.permissions;
