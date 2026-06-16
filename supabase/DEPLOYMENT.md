# RAOS Enterprise — Deployment Guide

## TAHAP 1: Buat Database Supabase

1. Buka https://supabase.com → New Project
2. Nama: `raos-production`, Region: `Southeast Asia (Singapore)`
3. Copy: `Project URL`, `anon key`, `service_role key`

## TAHAP 2: Set Environment Variables

```env
# .env.local (Next.js)
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...    # jangan expose ke frontend!

# Vercel Environment Variables (dashboard Vercel)
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
ANTHROPIC_API_KEY=...               # untuk Rifim AI
```

## TAHAP 3: Jalankan SQL Migrations (urutan wajib)

Di Supabase Dashboard → SQL Editor, jalankan satu per satu:

```
supabase/migrations/001_airports.sql        ← airports + seed 7 bandara
supabase/migrations/002_roles.sql           ← roles + seed 5 role
supabase/migrations/003_users.sql           ← users + trigger auth
supabase/migrations/004_staff.sql           ← staff + kasbon
supabase/migrations/005_drivers.sql         ← drivers + driver_locations
supabase/migrations/006_attendance.sql      ← attendance + GPS distance
supabase/migrations/007_schedule.sql        ← staff_schedule + shift_config
supabase/migrations/008_payroll.sql         ← payroll + payroll_items
supabase/migrations/009_finance.sql         ← finance 3 tabel
supabase/migrations/010_queue.sql           ← pickup_queues + queue_history
supabase/migrations/011_ai.sql              ← knowledge + ai_conversations + KPI
supabase/migrations/012_security.sql        ← notifications + audit + RLS
```

**Atau via Supabase CLI:**
```bash
npx supabase db push --db-url postgresql://...
```

## TAHAP 4: Enable pgvector (untuk AI)

Di SQL Editor:
```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

Supabase sudah include pgvector — cukup enable.

## TAHAP 5: Buat User SUPER_ADMIN Pertama

Di Supabase Dashboard → Authentication → Users → Invite user:
- Email: admin@rifim.co.id
- Setelah user sign up, set role via SQL:
```sql
UPDATE users
SET role_id = (SELECT id FROM roles WHERE name = 'SUPER_ADMIN')
WHERE email = 'admin@rifim.co.id';
```

## TAHAP 6: Enable Realtime

Di Supabase Dashboard → Database → Replication:
Aktifkan tabel untuk realtime:
- `pickup_queues`
- `driver_locations`
- `notifications`

## TAHAP 7: Import Data dari Google Sheets

Export Google Sheets ke CSV, lalu jalankan scripts:

```bash
cd C:\Users\ADMIN\raos

# Install deps
npm install dotenv @supabase/supabase-js ts-node typescript @types/node

# Staff
npx ts-node scripts/migrate-staff.ts --file=data/staff.csv

# Driver (2 sheet)
npx ts-node scripts/migrate-driver.ts --internal=data/driver-airport.csv --external=data/driver-external.csv

# Attendance
npx ts-node scripts/migrate-attendance.ts --file=data/absensi.csv

# Payroll
npx ts-node scripts/migrate-payroll.ts --file=data/payroll.csv

# Finance (3 sheet)
npx ts-node scripts/migrate-finance.ts \
  --transactions=data/money.csv \
  --bills=data/tagihan.csv \
  --income=data/pendapatan-luar.csv
```

## TAHAP 8: Setup Auth Settings

Di Supabase Dashboard → Authentication → Settings:
- Site URL: `https://raos.rifim.co.id`
- Redirect URLs: `https://raos.rifim.co.id/auth/callback`
- Email template: Sesuaikan dengan branding RIFIM

## TAHAP 9: Enable RLS

RLS sudah di-enable via `012_security.sql`. Verifikasi:
```sql
SELECT tablename, rowsecurity FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;
```
Semua tabel harus `rowsecurity = true`.

## TAHAP 10: Deploy ke Vercel

```bash
cd C:\Users\ADMIN\raos
npx vercel --prod
```

Atau: push ke GitHub → Vercel auto-deploy dari branch `main`.

---

## PRODUCTION CHECKLIST

### Database
- [ ] Semua 12 migration berhasil dijalankan
- [ ] pgvector enabled
- [ ] RLS enabled di semua tabel (query verifikasi di atas)
- [ ] Seed data 7 bandara + 5 roles ada
- [ ] Realtime enabled untuk pickup_queues, driver_locations, notifications
- [ ] IVFFlat index untuk knowledge_chunks (setelah ada 1000+ chunks)

### Auth
- [ ] User SUPER_ADMIN pertama dibuat dan di-set role
- [ ] Site URL dan Redirect URLs dikonfigurasi
- [ ] Email template dikustomisasi

### Data Migration
- [ ] Staff semua 6 bandara terimport
- [ ] Driver INTERNAL dan EXTERNAL terimport
- [ ] Attendance historis terimport
- [ ] Payroll historis terimport
- [ ] Finance (transaksi, tagihan, pendapatan luar) terimport

### Next.js / Vercel
- [ ] Semua env vars set di Vercel dashboard
- [ ] Build berhasil (`npm run build` tanpa error)
- [ ] PWA manifest valid (lighthouse audit)
- [ ] Middleware auth berfungsi (test akses tanpa login)

### Security
- [ ] `SUPABASE_SERVICE_ROLE_KEY` tidak pernah expose ke frontend
- [ ] `ANTHROPIC_API_KEY` hanya di server-side
- [ ] RLS policies sudah ditest untuk setiap role
- [ ] Audit logs berjalan (test update data, cek tabel audit_logs)

### Performance
- [ ] Semua indexes sudah ada (query `pg_indexes`)
- [ ] `driver_locations` cleanup job (delete record > 24 jam): setup cron
- [ ] `activity_logs` retention policy (archive > 90 hari)
