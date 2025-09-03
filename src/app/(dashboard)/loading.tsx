import { SkeletonDashboard } from "@/components/ui/skeleton";

export default function DashboardLoading() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <SkeletonDashboard />
      </div>
    </div>
  );
}