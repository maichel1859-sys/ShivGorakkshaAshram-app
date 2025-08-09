import { Suspense } from "react";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/core/auth";
import { DashboardLayout } from "@/components/dashboard/layout";

export default async function AdminLayout({
  children,
  modal,
  stats,
  alerts,
  recent,
}: {
  children: React.ReactNode;
  modal: React.ReactNode;
  stats: React.ReactNode;
  alerts: React.ReactNode;
  recent: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect("/signin");
  }

  if (session.user.role !== "ADMIN") {
    redirect("/");
  }

  return (
    <DashboardLayout title="Admin Dashboard" allowedRoles={["ADMIN"]}>
      <Suspense fallback={<div>Loading admin dashboard...</div>}>
        {children}
      </Suspense>

      {/* Parallel routes */}
      <Suspense fallback={null}>{modal}</Suspense>
      <Suspense fallback={null}>{stats}</Suspense>
      <Suspense fallback={null}>{alerts}</Suspense>
      <Suspense fallback={null}>{recent}</Suspense>
    </DashboardLayout>
  );
}
