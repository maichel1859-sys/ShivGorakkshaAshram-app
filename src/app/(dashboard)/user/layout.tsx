import { Metadata } from "next";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/core/auth";
import { DashboardLayout } from "@/components/dashboard/layout";
import { Suspense } from "react";

export const metadata: Metadata = {
  title: "User Dashboard",
  description: "User dashboard for Shivgoraksha Ashram Management System",
};

interface UserLayoutProps {
  children: React.ReactNode;
  modal?: React.ReactNode;
  notifications?: React.ReactNode;
}

export default async function UserLayout({
  children,
  modal,
  notifications,
}: UserLayoutProps) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect("/signin");
  }

  if (session.user.role !== "USER") {
    redirect("/");
  }

  return (
    <DashboardLayout title="User Dashboard" allowedRoles={["USER"]}>
      <Suspense fallback={<div>Loading user dashboard...</div>}>
        {children}
      </Suspense>

      {/* Parallel routes - only essential ones */}
      {modal && <Suspense fallback={null}>{modal}</Suspense>}
      {notifications && <Suspense fallback={null}>{notifications}</Suspense>}
    </DashboardLayout>
  );
}
