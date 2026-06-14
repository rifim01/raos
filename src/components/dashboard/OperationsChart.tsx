"use client";

import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from "recharts";

const DAILY_DATA = [
  { hari: "Sen", antrian: 42, driver: 38, absen: 24 },
  { hari: "Sel", antrian: 55, driver: 51, absen: 26 },
  { hari: "Rab", antrian: 38, driver: 35, absen: 22 },
  { hari: "Kam", antrian: 60, driver: 58, absen: 28 },
  { hari: "Jum", antrian: 70, driver: 65, absen: 30 },
  { hari: "Sab", antrian: 85, driver: 80, absen: 18 },
  { hari: "Min", antrian: 50, driver: 45, absen: 12 },
];

const MONTHLY_DATA = [
  { bulan: "Jan", pendapatan: 120000000, pengeluaran: 85000000 },
  { bulan: "Feb", pendapatan: 135000000, pengeluaran: 90000000 },
  { bulan: "Mar", pendapatan: 128000000, pengeluaran: 88000000 },
  { bulan: "Apr", pendapatan: 152000000, pengeluaran: 95000000 },
  { bulan: "Mei", pendapatan: 165000000, pengeluaran: 102000000 },
  { bulan: "Jun", pendapatan: 178000000, pengeluaran: 110000000 },
];

const IDR = (v: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", notation: "compact", maximumFractionDigits: 0 }).format(v);

export function DailyOpsChart() {
  return (
    <div className="bg-white rounded-2xl card-shadow border border-gray-100 p-5">
      <h3 className="font-bold text-gray-800 mb-1">Operasional Harian</h3>
      <p className="text-xs text-gray-400 mb-4">Antrian, driver aktif & absensi minggu ini</p>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={DAILY_DATA} barSize={10} barGap={2}>
          <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
          <XAxis dataKey="hari" tick={{ fontSize: 11, fill: "#94A3B8" }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 11, fill: "#94A3B8" }} axisLine={false} tickLine={false} />
          <Tooltip
            contentStyle={{ borderRadius: 12, border: "1px solid #E2E8F0", fontSize: 12 }}
            cursor={{ fill: "#F8FAFC" }}
          />
          <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
          <Bar dataKey="antrian" name="Antrian" fill="#1565C0" radius={[4, 4, 0, 0]} />
          <Bar dataKey="driver" name="Driver Aktif" fill="#E53935" radius={[4, 4, 0, 0]} />
          <Bar dataKey="absen" name="Absen" fill="#FBC02D" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function RevenueChart() {
  return (
    <div className="bg-white rounded-2xl card-shadow border border-gray-100 p-5">
      <h3 className="font-bold text-gray-800 mb-1">Keuangan Bulanan</h3>
      <p className="text-xs text-gray-400 mb-4">Pendapatan vs pengeluaran 6 bulan terakhir</p>
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={MONTHLY_DATA}>
          <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
          <XAxis dataKey="bulan" tick={{ fontSize: 11, fill: "#94A3B8" }} axisLine={false} tickLine={false} />
          <YAxis tickFormatter={(v) => IDR(v)} tick={{ fontSize: 10, fill: "#94A3B8" }} axisLine={false} tickLine={false} />
          <Tooltip
            formatter={(v: unknown) => IDR(v as number)}
            contentStyle={{ borderRadius: 12, border: "1px solid #E2E8F0", fontSize: 12 }}
          />
          <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
          <Line dataKey="pendapatan" name="Pendapatan" stroke="#1565C0" strokeWidth={2.5} dot={false} />
          <Line dataKey="pengeluaran" name="Pengeluaran" stroke="#E53935" strokeWidth={2.5} dot={false} strokeDasharray="4 2" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
