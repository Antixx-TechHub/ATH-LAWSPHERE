import { Suspense } from "react";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { DashboardHome } from "@/components/dashboard/dashboard-home";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);

  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <DashboardHome user={session?.user} />
    </Suspense>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="h-8 w-64 bg-neutral-200 dark:bg-neutral-800 rounded animate-pulse" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-32 bg-neutral-200 dark:bg-neutral-800 rounded-lg animate-pulse"
          />
        ))}
      </div>
      <div className="h-96 bg-neutral-200 dark:bg-neutral-800 rounded-lg animate-pulse" />
    </div>
  );
}
