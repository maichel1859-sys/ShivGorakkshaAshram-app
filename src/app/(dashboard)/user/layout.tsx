import { Metadata } from "next";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/core/auth";
import { DashboardLayout } from "@/components/dashboard/layout";
import { Suspense, ReactNode } from "react";

export const metadata: Metadata = {
  title: "User Dashboard",
  description: "User dashboard for Shivgoraksha Ashram Management System",
};

export default async function UserLayout({
  children,
}: {
  children: ReactNode;
}) {
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
    </DashboardLayout>
  );
}
