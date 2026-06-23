import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import ModulPlaceholder from "@/components/shared/ModulPlaceholder";

export const dynamic = "force-dynamic";

export default async function InsentifPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <ModulPlaceholder
      title="Insentif"
      description="Modul pengelolaan insentif driver dan staff berdasarkan performa KPI, jumlah pickup, dan target bulanan. Terintegrasi dengan Payroll dan KPI Staff."
      eta="Q3 2026"
      icon={
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"
          className="w-10 h-10" style={{ color: "#22C55E" }}>
          <circle cx="12" cy="12" r="10"/>
          <path d="M8 12h8M12 8v8"/>
        </svg>
      }
    />
  );
}
