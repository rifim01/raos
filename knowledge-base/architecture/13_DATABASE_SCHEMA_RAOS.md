# DATABASE SCHEMA RAOS

Versi Knowledge Base AI 2026

## TUJUAN

Database RAOS menjadi pusat integrasi seluruh sistem PT Rifim Gemilang.

Menggabungkan:

* Rifim Attendance
* Admin Absensi
* RADMS Driver
* RADMS Payroll
* RADMS Dashboard
* Sistem Keuangan
* Knowledge Base AI

---

# MASTER TABLE

## airports

Data seluruh bandara.

Field:

* id
* airport_code
* airport_name
* city
* latitude
* longitude
* status
* created_at

Contoh:

DJB001
PKU001
BTH001
BPN001
MDC001
UPG001
CGK001

---

## users

Semua akun sistem.

Field:

* id
* full_name
* email
* phone
* role
* airport_id
* status
* created_at

Role:

* SUPER_ADMIN
* DIRECTOR
* AIRPORT_COORDINATOR
* STAFF
* DRIVER

---

# SDM MODULE

## staff

Data Staff dan Koordinator.

Field:

* id
* user_id
* employee_code
* position
* airport_id
* join_date
* employment_status
* salary_grade

---

## shifts

Jadwal kerja.

Field:

* id
* shift_name
* start_time
* end_time

---

## attendance

Absensi.

Field:

* id
* staff_id
* airport_id
* shift_id
* check_in
* check_out
* latitude
* longitude
* photo_url
* attendance_status

Status:

* HADIR
* TERLAMBAT
* IZIN
* SAKIT
* CUTI
* ALPHA

---

# DRIVER MODULE

## drivers

Master Driver.

Field:

* id
* driver_code
* full_name
* phone
* vehicle_type
* vehicle_number
* airport_id
* status

---

## driver_queue

Antrian Driver.

Field:

* id
* driver_id
* airport_id
* queue_number
* queue_status
* join_time
* pickup_time

Status:

* WAITING
* CALLED
* PICKUP
* FINISHED
* HOLD

---

## driver_violations

Pelanggaran Driver.

Field:

* id
* driver_id
* violation_type
* description
* evidence_url
* sanction
* created_at

---

# PICKUP POINT MODULE

## pickup_points

Data lokasi pickup.

Field:

* id
* airport_id
* point_name
* latitude
* longitude
* status

---

## pickups

Aktivitas pickup.

Field:

* id
* airport_id
* driver_id
* pickup_point_id
* pickup_time
* completion_time
* status

---

# KPI MODULE

## kpi_scores

Field:

* id
* staff_id
* month
* year
* attendance_score
* sop_score
* productivity_score
* service_score
* teamwork_score
* total_score

---

## employee_rankings

Field:

* id
* airport_id
* month
* year
* rank_position
* staff_id
* final_score

---

# PAYROLL MODULE

## payroll

Field:

* id
* staff_id
* month
* year
* gapok
* bpjs
* kuota
* bonus
* lembur
* total_income

---

## payroll_deductions

Field:

* id
* payroll_id
* late_penalty
* alpha_penalty
* kasbon
* other_deductions
* total_deductions

---

## payroll_final

Field:

* id
* payroll_id
* gross_salary
* total_deductions
* net_salary
* payroll_status

---

# INSENTIF MODULE

## incentives

Field:

* id
* staff_id
* airport_id
* incentive_type
* amount
* reason
* month
* year

---

# KASBON MODULE

## kasbon

Field:

* id
* staff_id
* amount
* reason
* request_date
* approval_status

Status:

* PENDING
* APPROVED
* REJECTED
* PAID

---

# KEUANGAN MODULE

## money_transactions

Field:

* id
* airport_id
* transaction_type
* category
* amount
* description
* transaction_date

Jenis:

* INCOME
* EXPENSE

---

## invoices

Field:

* id
* airport_id
* invoice_number
* amount
* due_date
* status

---

# LAPORAN MODULE

## daily_reports

Field:

* id
* airport_id
* report_date
* active_drivers
* active_staff
* pickups
* violations
* notes

---

## incident_reports

Field:

* id
* airport_id
* incident_type
* description
* action_taken
* evidence_url
* created_at

---

# AI KNOWLEDGE MODULE

## knowledge_documents

Field:

* id
* document_name
* category
* version
* uploaded_by
* uploaded_at

Kategori:

* SOP
* Payroll
* Bandara
* KPI
* SDM
* FAQ

---

## ai_chat_logs

Field:

* id
* user_id
* question
* answer
* created_at

---

# RELASI UTAMA

Airport
↓
Staff
↓
Absensi
↓
KPI
↓
Payroll
↓
Insentif

Airport
↓
Driver
↓
Queue
↓
Pickup
↓
Laporan

Knowledge Base
↓
Rifim AI
↓
RAOS Assistant

---

# DASHBOARD RAOS

Data Dashboard otomatis mengambil data dari:

* airports
* staff
* attendance
* drivers
* driver_queue
* payroll
* incentives
* money_transactions

---

# INFORMASI UNTUK AI

Jika pengguna bertanya tentang struktur database RAOS, relasi data, payroll engine, attendance engine, KPI engine, driver management, atau integrasi AI, gunakan dokumen ini sebagai referensi utama.
