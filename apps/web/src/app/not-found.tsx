import Link from "next/link";
import { SearchX } from "lucide-react";
import { buttonClasses, Card, EmptyState } from "@/components/ui";

export default function NotFound() {
  return (
    <Card>
      <EmptyState
        icon={<SearchX className="size-7" />}
        title="We couldn't find that page"
        description="The simulation may have been deleted, or the link is mistyped."
        action={
          <div className="flex flex-wrap justify-center gap-2">
            <Link href="/simulations" className={buttonClasses("secondary", "md")}>
              Open history
            </Link>
            <Link href="/" className={buttonClasses("primary", "md")}>
              Go to workspace
            </Link>
          </div>
        }
      />
    </Card>
  );
}
