import { Dashboard } from "@/features/dashboard/Dashboard";
import { listSimulations } from "@/server/simulation-log";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const recent = (await listSimulations().catch(() => [])).slice(0, 3);
  return <Dashboard recent={recent} />;
}
