// Test dashboard: "Test all" runner plus the combined charts and averages of every saved test run
import { TestDashboard } from "@/features/tests/TestDashboard";
import { listTestRuns } from "@/lib/api";

export const dynamic = "force-dynamic";

export const metadata = { title: "Tests · Route Optimizer" };

export default async function TestsPage() {
  try {
    return <TestDashboard initial={await listTestRuns()} initialError={null} />;
  } catch (err) {
    return <TestDashboard initial={[]} initialError={(err as Error).message} />;
  }
}
