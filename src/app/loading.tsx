"use client";

import { SkeletonDashboard } from "@/components/loading";
import { useAppLoading, useRouteLoading, useDataLoading } from "@/store/app-store";

export default function RootLoading() {
  const isLoading = useAppLoading();
  const isRouteLoading = useRouteLoading();
  const isDataLoading = useDataLoading();

  // Show loading skeleton when any loading state is active
  if (!isLoading && !isRouteLoading && !isDataLoading) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <div className="container mx-auto px-4 py-8">
        <SkeletonDashboard />
      </div>
    </div>
  );
}