import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import ModulPlaceholder from "@/components/shared/ModulPlaceholder";

export const dynamic = "force-dynamic";

export default async function PetaBandaraPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <ModulPlaceholder
      title="Peta Bandara"
      description="Visualisasi peta interaktif per bandara — zona pickup, posisi driver real-time, geofence, dan heatmap kepadatan penumpang. Tampilan lebih detail dari Live Tracking."
      eta="Q3 2026"
      icon={
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"
          className="w-10 h-10" style={{ color: "#06B6D4" }}>
          <polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21"/>
          <line x1="9" y1="3" x2="9" y2="18"/>
          <line x1="15" y1="6" x2="15" y2="21"/>
        </svg>
      }
    />
  );
}
