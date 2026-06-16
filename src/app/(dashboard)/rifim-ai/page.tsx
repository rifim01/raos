import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getAIHistory } from "@/lib/ai-engine";
import RifimAIClient from "./RifimAIClient";

export const dynamic = "force-dynamic";

export default async function RifimAIPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const history = await getAIHistory(user.id, 30);

  return (
    <RifimAIClient
      userName={user.full_name ?? user.email ?? "Pengguna"}
      userRole={user.role}
      userRoleLevel={user.role_level}
      airportCode={user.airport_code}
      initialHistory={history}
    />
  );
}
