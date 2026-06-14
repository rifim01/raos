export type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

export type UserRole = "SUPER_ADMIN" | "DIRECTOR" | "AIRPORT_COORDINATOR" | "STAFF" | "DRIVER";
export type DriverStatus = "ACTIVE" | "INACTIVE" | "SUSPENDED" | "ON_DUTY" | "OFF_DUTY";
export type StaffStatus = "ACTIVE" | "INACTIVE" | "LEAVE";
export type QueueStatus = "WAITING" | "SERVING" | "DONE" | "VIOLATION";
export type AttendanceStatus = "PRESENT" | "ABSENT" | "LATE" | "SICK" | "LEAVE";
export type PayrollStatus = "DRAFT" | "PROCESSED" | "PAID";
export type LeaveType = "ANNUAL" | "SICK" | "EMERGENCY" | "MATERNITY" | "UNPAID";

export interface Database {
  public: {
    Tables: {
      airports: {
        Row: {
          id: string;
          code: string;
          name: string;
          city: string;
          province: string;
          latitude: number;
          longitude: number;
          partner: string | null;
          status: "ACTIVE" | "PLANNED" | "INACTIVE";
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["airports"]["Row"], "id" | "created_at" | "updated_at">;
        Update: Partial<Database["public"]["Tables"]["airports"]["Insert"]>;
      };
      profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string;
          role: UserRole;
          airport_id: string | null;
          phone: string | null;
          avatar_url: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["profiles"]["Row"], "created_at" | "updated_at">;
        Update: Partial<Database["public"]["Tables"]["profiles"]["Insert"]>;
      };
      drivers: {
        Row: {
          id: string;
          airport_id: string;
          driver_id: string;
          full_name: string;
          nik: string | null;
          phone: string;
          license_number: string | null;
          license_expiry: string | null;
          vehicle_type: string | null;
          vehicle_number: string | null;
          status: DriverStatus;
          type: "INTERNAL" | "EXTERNAL";
          kpi_score: number;
          notes: string | null;
          photo_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["drivers"]["Row"], "id" | "created_at" | "updated_at">;
        Update: Partial<Database["public"]["Tables"]["drivers"]["Insert"]>;
      };
      driver_locations: {
        Row: {
          id: string;
          driver_id: string;
          latitude: number;
          longitude: number;
          speed: number | null;
          heading: number | null;
          accuracy: number | null;
          is_online: boolean;
          recorded_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["driver_locations"]["Row"], "id">;
        Update: Partial<Database["public"]["Tables"]["driver_locations"]["Insert"]>;
      };
      pickup_queues: {
        Row: {
          id: string;
          airport_id: string;
          driver_id: string;
          queue_number: number;
          status: QueueStatus;
          check_in_time: string;
          serve_time: string | null;
          done_time: string | null;
          date: string;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["pickup_queues"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["pickup_queues"]["Insert"]>;
      };
      staff: {
        Row: {
          id: string;
          airport_id: string;
          staff_id: string;
          full_name: string;
          nik: string | null;
          phone: string;
          position: string;
          department: string | null;
          shift: string | null;
          status: StaffStatus;
          join_date: string | null;
          salary_base: number;
          photo_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["staff"]["Row"], "id" | "created_at" | "updated_at">;
        Update: Partial<Database["public"]["Tables"]["staff"]["Insert"]>;
      };
      staff_attendance: {
        Row: {
          id: string;
          staff_id: string;
          airport_id: string;
          date: string;
          check_in: string | null;
          check_out: string | null;
          check_in_lat: number | null;
          check_in_lng: number | null;
          check_out_lat: number | null;
          check_out_lng: number | null;
          status: AttendanceStatus;
          notes: string | null;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["staff_attendance"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["staff_attendance"]["Insert"]>;
      };
      staff_schedules: {
        Row: {
          id: string;
          staff_id: string;
          airport_id: string;
          shift_name: string;
          shift_start: string;
          shift_end: string;
          work_days: string[];
          effective_from: string;
          effective_to: string | null;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["staff_schedules"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["staff_schedules"]["Insert"]>;
      };
      payroll: {
        Row: {
          id: string;
          staff_id: string;
          airport_id: string;
          period_month: number;
          period_year: number;
          salary_base: number;
          overtime_hours: number;
          overtime_pay: number;
          bonus: number;
          incentive: number;
          deductions: number;
          kasbon_deduction: number;
          absence_deduction: number;
          total_gross: number;
          total_net: number;
          status: PayrollStatus;
          paid_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["payroll"]["Row"], "id" | "created_at" | "updated_at">;
        Update: Partial<Database["public"]["Tables"]["payroll"]["Insert"]>;
      };
      kasbon: {
        Row: {
          id: string;
          staff_id: string;
          airport_id: string;
          amount: number;
          remaining: number;
          monthly_installment: number;
          purpose: string | null;
          date: string;
          status: "ACTIVE" | "PAID";
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["kasbon"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["kasbon"]["Insert"]>;
      };
      leave_requests: {
        Row: {
          id: string;
          staff_id: string;
          airport_id: string;
          type: LeaveType;
          start_date: string;
          end_date: string;
          days: number;
          reason: string | null;
          status: "PENDING" | "APPROVED" | "REJECTED";
          approved_by: string | null;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["leave_requests"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["leave_requests"]["Insert"]>;
      };
      finance_income: {
        Row: {
          id: string;
          airport_id: string;
          category: string;
          amount: number;
          description: string | null;
          date: string;
          source: string | null;
          created_by: string | null;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["finance_income"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["finance_income"]["Insert"]>;
      };
      finance_expense: {
        Row: {
          id: string;
          airport_id: string;
          category: string;
          amount: number;
          description: string | null;
          date: string;
          vendor: string | null;
          created_by: string | null;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["finance_expense"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["finance_expense"]["Insert"]>;
      };
      finance_bills: {
        Row: {
          id: string;
          airport_id: string;
          title: string;
          amount: number;
          due_date: string;
          status: "UNPAID" | "PAID" | "OVERDUE";
          paid_at: string | null;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["finance_bills"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["finance_bills"]["Insert"]>;
      };
      notifications: {
        Row: {
          id: string;
          user_id: string | null;
          airport_id: string | null;
          title: string;
          body: string;
          type: string;
          is_read: boolean;
          data: Json | null;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["notifications"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["notifications"]["Insert"]>;
      };
      activity_logs: {
        Row: {
          id: string;
          user_id: string;
          airport_id: string | null;
          action: string;
          entity: string;
          entity_id: string | null;
          changes: Json | null;
          ip_address: string | null;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["activity_logs"]["Row"], "id" | "created_at">;
        Update: never;
      };
    };
    Views: {};
    Functions: {};
    Enums: {};
  };
}
