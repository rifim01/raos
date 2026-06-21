import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase'; // Jika menggunakan path alias '@' ke 'src'

// Deklarasi tipe eksplisit untuk entitas attendance agar build TypeScript lolos
interface AttendanceRecord {
  id: string; // Ubah ke 'number' jika kolom id di tabel Supabase berupa BIGINT/SERIAL
  employee_id: string;
  check_in: string;
  check_out?: string | null;
  status?: string | null;
  created_at?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Mendukung payload langsung berupa array maupun nested di dalam properti logs/attendanceData
    const logs = Array.isArray(body) ? body : body.logs || body.attendanceData;

    if (!logs || !Array.isArray(logs)) {
      return NextResponse.json(
        { error: 'Payload tidak valid: Mengharapkan array data kehadiran' },
        { status: 400 }
      );
    }

    // Melakukan operasi upsert data dari rifim-attendance ke Supabase
    const { data, error } = await supabase
      .from('attendance')
      .upsert(logs)
      .select();

    if (error) {
      return NextResponse.json(
        { error: `Gagal sinkronisasi ke database: ${error.message}` },
        { status: 500 }
      );
    }

    // Cast data yang sebelumnya ter-infer sebagai 'never[] | null' menjadi tipe yang valid
    const syncedData = data as unknown as AttendanceRecord[] | null;

    if (!syncedData || syncedData.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'Sinkronisasi selesai tanpa ada baris data baru yang dikembalikan.',
        syncedIds: []
      }, { status: 200 });
    }

    // Ekstraksi ID secara aman demi verifikasi data yang tersinkron
    const syncedIds = syncedData.map((item) => item.id);

    return NextResponse.json({
      success: true,
      message: `Berhasil melakukan sinkronisasi ${syncedIds.length} data kehadiran.`,
      syncedIds
    }, { status: 200 });

  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
