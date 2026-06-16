-- ============================================================
-- RAOS - Seed Data
-- Initial airports & demo users
-- ============================================================

-- Insert Airports
INSERT INTO airports (code, name, city, province, latitude, longitude, partner, status) VALUES
  ('DJB001', 'Bandara Sultan Thaha Saifuddin', 'Jambi', 'Jambi', -1.6318503590205926, 103.6438520018439, 'Angkasa Pura Indonesia', 'ACTIVE'),
  ('PKU001', 'Bandara Sultan Syarif Kasim II', 'Pekanbaru', 'Riau', 0.4649444, 101.4484722, 'Puskopau', 'ACTIVE'),
  ('BTH001', 'Bandara Internasional Hang Nadim', 'Batam', 'Kepulauan Riau', 1.1227222, 104.1194444, 'PT BIB', 'ACTIVE'),
  ('BPN001', 'Bandara Sultan Aji Muhammad Sulaiman Sepinggan', 'Balikpapan', 'Kalimantan Timur', -1.2657500, 116.9000833, 'Primkopau', 'ACTIVE'),
  ('MDC001', 'Bandara Internasional Sam Ratulangi', 'Manado', 'Sulawesi Utara', 1.5498778, 124.9254778, 'Koperasi Mahkota', 'ACTIVE'),
  ('UPG001', 'Bandara Internasional Sultan Hasanuddin', 'Makassar', 'Sulawesi Selatan', -5.0771667, 119.5541389, 'PT Rifim Gemilang', 'ACTIVE'),
  ('CGK001', 'Bandara Internasional Soekarno-Hatta', 'Tangerang', 'Banten', -6.1256, 106.6558, 'PT Rifim Gemilang', 'PLANNED')
ON CONFLICT (code) DO NOTHING;
