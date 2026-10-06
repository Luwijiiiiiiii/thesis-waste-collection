import { Dashboard } from "@/features/dashboard/Dashboard";
import { listSimulations } from "@/lib/api";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  // The dashboard still works without the API; it just shows no recent runs.
  const recent = await listSimulations(3).catch(() => []);
  return <Dashboard recent={recent} />;
}
