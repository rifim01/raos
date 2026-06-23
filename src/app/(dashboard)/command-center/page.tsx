import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import ModulPlaceholder from "@/components/shared/ModulPlaceholder";

export const dynamic = "force-dynamic";

export default async function CommandCenterPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <ModulPlaceholder
      title="Command Center"
      description="Pusat komando operasional nasional — tampilan agregat multi-bandara, dispatch manual, broadcast instruksi, dan monitoring insiden real-time dari satu layar."
      eta="Q4 2026"
      icon={
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"
          className="w-10 h-10" style={{ color: "#C62828" }}>
          <rect x="2" y="3" width="20" height="14" rx="2"/>
          <path d="M8 21h8M12 17v4"/>
        </svg>
      }
    />
  );
}
