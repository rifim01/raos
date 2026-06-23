import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import ModulPlaceholder from "@/components/shared/ModulPlaceholder";

export const dynamic = "force-dynamic";

export default async function AntrianPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <ModulPlaceholder
      title="Manajemen Antrian"
      description="Modul antrian terintegrasi dengan sistem pickup bandara. Menampilkan queue real-time, panggilan driver, status WAITING/CALLED/SERVING/DONE, dan riwayat antrian harian per cabang."
      eta="Q3 2026"
      icon={
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"
          className="w-10 h-10" style={{ color: "#FFD300" }}>
          <line x1="8" y1="6" x2="21" y2="6"/>
          <line x1="8" y1="12" x2="21" y2="12"/>
          <line x1="8" y1="18" x2="21" y2="18"/>
          <line x1="3" y1="6" x2="3.01" y2="6"/>
          <line x1="3" y1="12" x2="3.01" y2="12"/>
          <line x1="3" y1="18" x2="3.01" y2="18"/>
        </svg>
      }
    />
  );
}
