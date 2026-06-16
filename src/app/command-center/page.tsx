import CommandCenterClient from "./CommandCenterClient";

export const dynamic = "force-dynamic";

interface Props {
  searchParams: Promise<{ airport?: string; code?: string }>;
}

export default async function CommandCenterPage({ searchParams }: Props) {
  const { airport: airportId, code: airportCode } = await searchParams;
  return <CommandCenterClient airportId={airportId ?? ""} airportCode={airportCode ?? "—"} />;
}
