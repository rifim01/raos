// ============================================================
// RAOS ENTERPRISE — TypeScript Database Types
// Auto-generated dari schema Supabase Production
// Gunakan: supabase gen types typescript --project-id <id> untuk regenerate
// ============================================================

export type Json = string | number | boolean | null | { [key: string]: Json } | Json[]

// ─── ENUMS ───────────────────────────────────────────────────
export type AirportStatus    = 'ACTIVE' | 'PLANNED' | 'INACTIVE'
export type RoleName         = 'SUPER_ADMIN' | 'DIRECTOR' | 'AIRPORT_COORDINATOR' | 'STAFF' | 'DRIVER'
export type StaffStatus      = 'ACTIVE' | 'INACTIVE' | 'LEAVE' | 'TERMINATED'
export type DriverStatus     = 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | 'ON_DUTY' | 'OFF_DUTY'
export type DriverType       = 'INTERNAL' | 'EXTERNAL'
export type CheckType        = 'CHECK_IN' | 'CHECK_OUT'
export type DistanceStatus   = 'VALID' | 'INVALID' | 'UNKNOWN'
export type ShiftType        = 'PAGI' | 'SIANG' | 'MALAM' | 'LIBUR' | 'CUSTOM'
export type QueueStatus      = 'WAITING' | 'CALLED' | 'SERVING' | 'DONE' | 'SKIP' | 'VIOLATION'
export type PayrollStatus    = 'DRAFT' | 'REVIEW' | 'APPROVED' | 'PAID'
export type PayrollItemType  = 'PENDAPATAN' | 'POTONGAN'
export type FinanceJenis     = 'PEMASUKAN' | 'PENGELUARAN'
export type BillStatus       = 'UNPAID' | 'PAID' | 'OVERDUE' | 'DISPUTED'
export type KnowledgeCategory = 'SOP' | 'KEBIJAKAN' | 'REGULASI' | 'PANDUAN' | 'FAQ' | 'LAPORAN' | 'LAINNYA'
export type NotificationType = 'INFO' | 'WARNING' | 'SUCCESS' | 'ERROR' | 'QUEUE' | 'PAYROLL' | 'FINANCE' | 'ATTENDANCE'
export type AuditOperation   = 'INSERT' | 'UPDATE' | 'DELETE'
export type RecordStatus     = 'ACTIVE' | 'INACTIVE'

// ─── TABLE ROW TYPES ─────────────────────────────────────────

export type Airport = {
  id:           string
  code:         string
  name:         string
  city:         string
  province:     string | null
  partner:      string | null
  latitude:     number
  longitude:    number
  radius_meter: number
  status:       AirportStatus
  created_at:   string
  updated_at:   string
}

export type Role = {
  id:          number
  name:        RoleName
  label:       string
  level:       number
  description: string | null
  permissions: Json
  created_at:  string
}

export type User = {
  id:           string
  auth_user_id: string | null
  airport_id:   string | null
  role_id:      number
  email:        string | null
  full_name:    string
  phone:        string | null
  avatar_url:   string | null
  is_active:    boolean
  last_login:   string | null
  created_at:   string
  updated_at:   string
}

export type Staff = {
  id:            string
  airport_id:    string
  user_id:       string | null
  staff_code:    string
  nama:          string
  email:         string | null
  jabatan:       string
  department:    string | null
  gaji_pokok:    number
  bpjs_nominal:  number
  kuota_nominal: number
  deposit:       number
  join_date:     string | null
  photo_url:     string | null
  status:        StaffStatus
  created_at:    string
  updated_at:    string
}

export type Kasbon = {
  id:                string
  staff_id:          string
  airport_id:        string
  jumlah:            number
  sisa:              number
  cicilan_per_bulan: number
  tujuan:            string | null
  tanggal:           string
  status:            RecordStatus
  created_at:        string
  updated_at:        string
}

export type StaffSchedule = {
  id:         string
  staff_id:   string
  tanggal:    string
  shift:      ShiftType
  jam_masuk:  string | null
  jam_keluar: string | null
  notes:      string | null
  created_at: string
  updated_at: string
}

export type Attendance = {
  id:              string
  staff_id:        string
  airport_id:      string
  tanggal:         string
  check_type:      CheckType
  gps_location:    string | null
  latitude:        number | null
  longitude:       number | null
  distance_meter:  number | null
  distance_status: DistanceStatus
  photo_url:       string | null
  device_info:     string | null
  notes:           string | null
  created_at:      string
}

export type ViolationSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
export type ViolationStatus   = 'OPEN' | 'REVIEWED' | 'RESOLVED' | 'DISMISSED'
export type ViolationType     = 'GEOFENCE_EXIT' | 'LATE_CHECK_IN' | 'NO_SHOW' | 'SPEEDING' | 'ROUTE_DEVIATION' | 'UNAUTHORIZED_STOP'

export type Violation = {
  id:          string
  airport_id:  string
  driver_id:   string
  type:        ViolationType
  description: string | null
  severity:    ViolationSeverity
  status:      ViolationStatus
  occurred_at: string
  resolved_at: string | null
  notes:       string | null
  created_at:  string
}

export type Driver = {
  id:          string
  airport_id:  string
  user_id:     string | null
  driver_code: string
  nama:        string
  nomor_hp:    string | null
  nik:         string | null
  driver_type: DriverType
  status:      DriverStatus
  photo_url:   string | null
  created_at:  string
  updated_at:  string
}

export type DriverLocation = {
  id:         string
  driver_id:  string
  latitude:   number
  longitude:  number
  speed:      number | null
  heading:    number | null
  accuracy:   number | null
  last_seen:  string
  created_at: string
}

export type PickupQueue = {
  id:           string
  airport_id:   string
  driver_id:    string
  queue_number: number
  status:       QueueStatus
  tanggal:      string
  call_time:    string | null
  serve_time:   string | null
  done_time:    string | null
  notes:        string | null
  created_at:   string
}

export type QueueHistory = {
  id:         string
  queue_id:   string
  action:     string
  notes:      string | null
  actor_id:   string | null
  created_at: string
}

export type Payroll = {
  id:               string
  staff_id:         string
  periode:          string
  periode_bulan:    number
  periode_tahun:    number
  gaji_pokok:       number
  bpjs:             number
  kuota:            number
  bonus:            number
  lembur:           number
  kasbon:           number
  denda_telat:      number
  potongan_alpha:   number
  deposit:          number
  total_pendapatan: number   // GENERATED
  total_potongan:   number   // GENERATED
  gaji_bersih:      number   // GENERATED
  total_hadir:      number
  total_terlambat:  number
  total_alpha:      number
  jam_lembur:       number
  status:           PayrollStatus
  approved_by:      string | null
  paid_at:          string | null
  notes:            string | null
  created_at:       string
  updated_at:       string
}

export type PayrollItem = {
  id:         string
  payroll_id: string
  item_name:  string
  item_type:  PayrollItemType
  amount:     number
  notes:      string | null
  created_at: string
}

export type FinanceTransaction = {
  id:         string
  airport_id: string
  jenis:      FinanceJenis
  kategori:   string
  nominal:    number
  keterangan: string | null
  tanggal:    string
  bukti_url:  string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

export type FinanceBill = {
  id:             string
  airport_id:     string
  vendor:         string
  invoice_number: string | null
  jumlah:         number
  jatuh_tempo:    string
  status:         BillStatus
  keterangan:     string | null
  bukti_url:      string | null
  paid_at:        string | null
  created_by:     string | null
  created_at:     string
  updated_at:     string
}

export type FinanceExternalIncome = {
  id:         string
  airport_id: string
  sumber:     string
  nominal:    number
  tanggal:    string
  keterangan: string | null
  bukti_url:  string | null
  created_by: string | null
  created_at: string
}

export type AirportDailyReport = {
  id:                  string
  airport_id:          string
  report_date:         string
  total_driver:        number
  total_staff:         number
  total_pickup:        number
  total_income:        number
  total_expense:       number
  attendance_rate:     number | null
  queue_avg_wait_min:  number | null
  notes:               string | null
  created_at:          string
}

export type KnowledgeDocument = {
  id:          string
  title:       string
  category:    KnowledgeCategory
  file_path:   string | null
  content:     string | null
  airport_id:  string | null
  is_active:   boolean
  uploaded_by: string | null
  created_at:  string
  updated_at:  string
}

export type KnowledgeChunk = {
  id:          string
  document_id: string
  chunk_index: number
  chunk_text:  string
  embedding:   unknown | null   // vector(1536)
  token_count: number | null
  created_at:  string
}

export type AiConversation = {
  id:             string
  user_id:        string
  airport_id:     string | null
  question:       string
  answer:         string
  tokens_used:    number | null
  model:          string
  context_chunks: string[] | null
  rating:         number | null
  created_at:     string
}

export type Notification = {
  id:         string
  user_id:    string | null
  airport_id: string | null
  title:      string
  message:    string
  type:       NotificationType
  is_read:    boolean
  data:       Json | null
  created_at: string
}

export type ActivityLog = {
  id:         string
  user_id:    string
  airport_id: string | null
  action:     string
  module:     string
  entity_id:  string | null
  ip_address: string | null
  user_agent: string | null
  created_at: string
}

export type AuditLog = {
  id:         string
  user_id:    string | null
  table_name: string
  record_id:  string | null
  operation:  AuditOperation
  old_value:  Json | null
  new_value:  Json | null
  created_at: string
}

// ─── VIEW TYPES ───────────────────────────────────────────────

export type VwDashboardNasional = {
  total_airports:         number
  total_driver_aktif:     number
  total_staff_aktif:      number
  total_pickup_hari_ini:  number
  queue_menunggu:         number
  income_hari_ini:        number
  expense_hari_ini:       number
  staff_hadir_hari_ini:   number
  tagihan_jatuh_tempo:    number
  driver_online_sekarang: number
}

export type VwDashboardBandara = {
  airport_id:     string
  airport_code:   string
  airport_name:   string
  city:           string
  status:         AirportStatus
  total_staff:    number
  total_driver:   number
  queue_hari_ini: number
  queue_waiting:  number
  queue_done:     number
  staff_hadir:    number
  income_hari_ini:  number
  expense_hari_ini: number
  driver_online:  number
  tagihan_overdue: number
}

export type VwPayrollSummary = {
  airport_code:      string
  airport_name:      string
  periode:           string
  periode_bulan:     number
  periode_tahun:     number
  jumlah_staff:      number
  total_gaji_pokok:  number
  total_pendapatan:  number
  total_potongan:    number
  total_gaji_bersih: number
  total_kasbon:      number
  total_bonus:       number
  total_lembur:      number
  rata_hadir:        number
  total_alpha:       number
  status:            PayrollStatus
}

export type VwDriverStatus = {
  driver_id:     string
  driver_code:   string
  nama:          string
  driver_type:   DriverType
  driver_status: DriverStatus
  airport_code:  string
  airport_name:  string
  latitude:      number | null
  longitude:     number | null
  speed:         number | null
  last_seen:     string | null
  online_status: 'ONLINE' | 'IDLE' | 'OFFLINE'
  queue_number:  number | null
  queue_status:  QueueStatus | null
  queue_join_time: string | null
}

export type VwAttendanceSummary = {
  staff_id:         string
  staff_code:       string
  nama:             string
  jabatan:          string
  airport_code:     string
  tanggal:          string
  waktu_masuk:      string | null
  waktu_keluar:     string | null
  status_masuk:     DistanceStatus | null
  status_keluar:    DistanceStatus | null
  foto_masuk:       string | null
  shift:            ShiftType | null
  jadwal_masuk:     string | null
  jadwal_keluar:    string | null
  status_kehadiran: 'HADIR' | 'TERLAMBAT' | 'ALPHA'
  durasi_menit:     number | null
}

// ─── SUPABASE DATABASE TYPE (untuk createClient<Database>) ───

export type Database = {
  public: {
    Tables: {
      airports:               { Row: Airport;               Insert: Omit<Airport, 'id'|'created_at'|'updated_at'>; Update: Partial<Omit<Airport, 'id'>>; Relationships: [] }
      roles:                  { Row: Role;                  Insert: Omit<Role, 'id'|'created_at'>;                  Update: Partial<Omit<Role, 'id'>>; Relationships: [] }
      users:                  { Row: User;                  Insert: Omit<User, 'id'|'created_at'|'updated_at'>;     Update: Partial<Omit<User, 'id'>>; Relationships: [{ foreignKeyName: 'users_airport_id_fkey', columns: ['airport_id'], isOneToOne: false, referencedRelation: 'airports', referencedColumns: ['id'] }, { foreignKeyName: 'users_role_id_fkey', columns: ['role_id'], isOneToOne: false, referencedRelation: 'roles', referencedColumns: ['id'] }] }
      staff:                  { Row: Staff;                 Insert: Omit<Staff, 'id'|'created_at'|'updated_at'>;    Update: Partial<Omit<Staff, 'id'>>; Relationships: [{ foreignKeyName: 'staff_airport_id_fkey', columns: ['airport_id'], isOneToOne: false, referencedRelation: 'airports', referencedColumns: ['id'] }, { foreignKeyName: 'staff_user_id_fkey', columns: ['user_id'], isOneToOne: false, referencedRelation: 'users', referencedColumns: ['id'] }] }
      kasbon:                 { Row: Kasbon;                Insert: Omit<Kasbon, 'id'|'created_at'|'updated_at'>;   Update: Partial<Omit<Kasbon, 'id'>>; Relationships: [{ foreignKeyName: 'kasbon_staff_id_fkey', columns: ['staff_id'], isOneToOne: false, referencedRelation: 'staff', referencedColumns: ['id'] }, { foreignKeyName: 'kasbon_airport_id_fkey', columns: ['airport_id'], isOneToOne: false, referencedRelation: 'airports', referencedColumns: ['id'] }] }
      staff_schedule:         { Row: StaffSchedule;         Insert: Omit<StaffSchedule, 'id'|'created_at'|'updated_at'>; Update: Partial<Omit<StaffSchedule, 'id'>>; Relationships: [{ foreignKeyName: 'staff_schedule_staff_id_fkey', columns: ['staff_id'], isOneToOne: false, referencedRelation: 'staff', referencedColumns: ['id'] }] }
      attendance:             { Row: Attendance;            Insert: Pick<Attendance, 'staff_id'|'airport_id'|'check_type'> & Partial<Omit<Attendance, 'id'|'created_at'|'staff_id'|'airport_id'|'check_type'>>; Update: never; Relationships: [{ foreignKeyName: 'attendance_staff_id_fkey', columns: ['staff_id'], isOneToOne: false, referencedRelation: 'staff', referencedColumns: ['id'] }, { foreignKeyName: 'attendance_airport_id_fkey', columns: ['airport_id'], isOneToOne: false, referencedRelation: 'airports', referencedColumns: ['id'] }] }
      drivers:                { Row: Driver;                Insert: Omit<Driver, 'id'|'created_at'|'updated_at'>;   Update: Partial<Omit<Driver, 'id'>>; Relationships: [{ foreignKeyName: 'drivers_airport_id_fkey', columns: ['airport_id'], isOneToOne: false, referencedRelation: 'airports', referencedColumns: ['id'] }, { foreignKeyName: 'drivers_user_id_fkey', columns: ['user_id'], isOneToOne: false, referencedRelation: 'users', referencedColumns: ['id'] }] }
      driver_locations:       { Row: DriverLocation;        Insert: Omit<DriverLocation, 'id'|'created_at'>;        Update: never; Relationships: [{ foreignKeyName: 'driver_locations_driver_id_fkey', columns: ['driver_id'], isOneToOne: false, referencedRelation: 'drivers', referencedColumns: ['id'] }] }
      pickup_queues:          { Row: PickupQueue;           Insert: Omit<PickupQueue, 'id'|'created_at'>;           Update: Partial<Omit<PickupQueue, 'id'>>; Relationships: [{ foreignKeyName: 'pickup_queues_airport_id_fkey', columns: ['airport_id'], isOneToOne: false, referencedRelation: 'airports', referencedColumns: ['id'] }, { foreignKeyName: 'pickup_queues_driver_id_fkey', columns: ['driver_id'], isOneToOne: false, referencedRelation: 'drivers', referencedColumns: ['id'] }] }
      queue_history:          { Row: QueueHistory;          Insert: Omit<QueueHistory, 'id'|'created_at'>;          Update: never; Relationships: [{ foreignKeyName: 'queue_history_queue_id_fkey', columns: ['queue_id'], isOneToOne: false, referencedRelation: 'pickup_queues', referencedColumns: ['id'] }, { foreignKeyName: 'queue_history_actor_id_fkey', columns: ['actor_id'], isOneToOne: false, referencedRelation: 'users', referencedColumns: ['id'] }] }
      payroll:                { Row: Payroll;               Insert: Omit<Payroll, 'id'|'created_at'|'updated_at'|'total_pendapatan'|'total_potongan'|'gaji_bersih'>; Update: Partial<Omit<Payroll, 'id'|'total_pendapatan'|'total_potongan'|'gaji_bersih'>>; Relationships: [{ foreignKeyName: 'payroll_staff_id_fkey', columns: ['staff_id'], isOneToOne: false, referencedRelation: 'staff', referencedColumns: ['id'] }, { foreignKeyName: 'payroll_approved_by_fkey', columns: ['approved_by'], isOneToOne: false, referencedRelation: 'users', referencedColumns: ['id'] }] }
      payroll_items:          { Row: PayrollItem;           Insert: Omit<PayrollItem, 'id'|'created_at'>;           Update: Partial<Omit<PayrollItem, 'id'>>; Relationships: [{ foreignKeyName: 'payroll_items_payroll_id_fkey', columns: ['payroll_id'], isOneToOne: false, referencedRelation: 'payroll', referencedColumns: ['id'] }] }
      finance_transactions:   { Row: FinanceTransaction;    Insert: Omit<FinanceTransaction, 'id'|'created_at'|'updated_at'>; Update: Partial<Omit<FinanceTransaction, 'id'>>; Relationships: [{ foreignKeyName: 'finance_transactions_airport_id_fkey', columns: ['airport_id'], isOneToOne: false, referencedRelation: 'airports', referencedColumns: ['id'] }, { foreignKeyName: 'finance_transactions_created_by_fkey', columns: ['created_by'], isOneToOne: false, referencedRelation: 'users', referencedColumns: ['id'] }] }
      finance_bills:          { Row: FinanceBill;           Insert: Omit<FinanceBill, 'id'|'created_at'|'updated_at'>; Update: Partial<Omit<FinanceBill, 'id'>>; Relationships: [{ foreignKeyName: 'finance_bills_airport_id_fkey', columns: ['airport_id'], isOneToOne: false, referencedRelation: 'airports', referencedColumns: ['id'] }, { foreignKeyName: 'finance_bills_created_by_fkey', columns: ['created_by'], isOneToOne: false, referencedRelation: 'users', referencedColumns: ['id'] }] }
      finance_external_income: { Row: FinanceExternalIncome; Insert: Omit<FinanceExternalIncome, 'id'|'created_at'>; Update: never; Relationships: [{ foreignKeyName: 'finance_external_income_airport_id_fkey', columns: ['airport_id'], isOneToOne: false, referencedRelation: 'airports', referencedColumns: ['id'] }, { foreignKeyName: 'finance_external_income_created_by_fkey', columns: ['created_by'], isOneToOne: false, referencedRelation: 'users', referencedColumns: ['id'] }] }
      airport_daily_reports:  { Row: AirportDailyReport;   Insert: Omit<AirportDailyReport, 'id'|'created_at'>;    Update: Partial<Omit<AirportDailyReport, 'id'>>; Relationships: [{ foreignKeyName: 'airport_daily_reports_airport_id_fkey', columns: ['airport_id'], isOneToOne: false, referencedRelation: 'airports', referencedColumns: ['id'] }] }
      knowledge_documents:    { Row: KnowledgeDocument;     Insert: Omit<KnowledgeDocument, 'id'|'created_at'|'updated_at'>; Update: Partial<Omit<KnowledgeDocument, 'id'>>; Relationships: [{ foreignKeyName: 'knowledge_documents_airport_id_fkey', columns: ['airport_id'], isOneToOne: false, referencedRelation: 'airports', referencedColumns: ['id'] }, { foreignKeyName: 'knowledge_documents_uploaded_by_fkey', columns: ['uploaded_by'], isOneToOne: false, referencedRelation: 'users', referencedColumns: ['id'] }] }
      knowledge_chunks:       { Row: KnowledgeChunk;        Insert: Omit<KnowledgeChunk, 'id'|'created_at'>;        Update: never; Relationships: [{ foreignKeyName: 'knowledge_chunks_document_id_fkey', columns: ['document_id'], isOneToOne: false, referencedRelation: 'knowledge_documents', referencedColumns: ['id'] }] }
      ai_conversations:       { Row: AiConversation;        Insert: Omit<AiConversation, 'id'|'created_at'>;        Update: Partial<Omit<AiConversation, 'id'>>; Relationships: [{ foreignKeyName: 'ai_conversations_user_id_fkey', columns: ['user_id'], isOneToOne: false, referencedRelation: 'users', referencedColumns: ['id'] }, { foreignKeyName: 'ai_conversations_airport_id_fkey', columns: ['airport_id'], isOneToOne: false, referencedRelation: 'airports', referencedColumns: ['id'] }] }
      notifications:          { Row: Notification;          Insert: Omit<Notification, 'id'|'created_at'>;          Update: Partial<Omit<Notification, 'id'>>; Relationships: [{ foreignKeyName: 'notifications_user_id_fkey', columns: ['user_id'], isOneToOne: false, referencedRelation: 'users', referencedColumns: ['id'] }, { foreignKeyName: 'notifications_airport_id_fkey', columns: ['airport_id'], isOneToOne: false, referencedRelation: 'airports', referencedColumns: ['id'] }] }
      activity_logs:          { Row: ActivityLog;           Insert: Omit<ActivityLog, 'id'|'created_at'>;           Update: never; Relationships: [{ foreignKeyName: 'activity_logs_user_id_fkey', columns: ['user_id'], isOneToOne: false, referencedRelation: 'users', referencedColumns: ['id'] }, { foreignKeyName: 'activity_logs_airport_id_fkey', columns: ['airport_id'], isOneToOne: false, referencedRelation: 'airports', referencedColumns: ['id'] }] }
      audit_logs:             { Row: AuditLog;              Insert: Omit<AuditLog, 'id'|'created_at'>;              Update: never; Relationships: [{ foreignKeyName: 'audit_logs_user_id_fkey', columns: ['user_id'], isOneToOne: false, referencedRelation: 'users', referencedColumns: ['id'] }] }
      violations:             { Row: Violation;             Insert: Pick<Violation, 'airport_id'|'driver_id'|'type'> & Partial<Omit<Violation, 'id'|'created_at'|'airport_id'|'driver_id'|'type'>>; Update: Partial<Omit<Violation, 'id'>>; Relationships: [{ foreignKeyName: 'violations_airport_id_fkey', columns: ['airport_id'], isOneToOne: false, referencedRelation: 'airports', referencedColumns: ['id'] }, { foreignKeyName: 'violations_driver_id_fkey', columns: ['driver_id'], isOneToOne: false, referencedRelation: 'drivers', referencedColumns: ['id'] }] }
    }
    Views: {
      vw_dashboard_nasional:  { Row: VwDashboardNasional; Relationships: [] }
      vw_dashboard_bandara:   { Row: VwDashboardBandara; Relationships: [] }
      vw_payroll_summary:     { Row: VwPayrollSummary; Relationships: [] }
      vw_driver_status:       { Row: VwDriverStatus; Relationships: [] }
      vw_attendance_summary:  { Row: VwAttendanceSummary; Relationships: [] }
    }
    Functions: {
      calculate_payroll:       { Args: { p_staff_id: string; p_bulan: number; p_tahun: number }; Returns: string }
      generate_queue_number:   { Args: { p_airport_id: string }; Returns: number }
      get_airport_summary:     { Args: { p_airport_id: string; p_date?: string }; Returns: Json }
      get_dashboard_nasional:  { Args: { p_date?: string }; Returns: Json }
      fn_match_knowledge_chunks: { Args: { query_embedding: unknown; match_threshold?: number; match_count?: number; p_airport_id?: string }; Returns: { id: string; document_id: string; chunk_text: string; similarity: number; doc_title: string; doc_category: string }[] }
    }
    Enums: {
      airport_status:    AirportStatus
      role_name:         RoleName
      staff_status:      StaffStatus
      driver_status:     DriverStatus
      driver_type:       DriverType
      check_type:        CheckType
      distance_status:   DistanceStatus
      shift_type:        ShiftType
      queue_status:      QueueStatus
      payroll_status:    PayrollStatus
      payroll_item_type: PayrollItemType
      finance_jenis:     FinanceJenis
      bill_status:       BillStatus
      knowledge_category: KnowledgeCategory
      notification_type: NotificationType
      audit_operation:   AuditOperation
      violation_severity: ViolationSeverity
      violation_status:   ViolationStatus
      violation_type:     ViolationType
    }
  }
}
