import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth/auth";
import { DashboardLayout } from "@/components/dashboard/layout";
import { Suspense } from "react";

export default async function CoordinatorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect("/signin");
  }

  if (session.user.role !== "COORDINATOR") {
    redirect("/");
  }

  return (
    <DashboardLayout
      title="Coordinator Dashboard"
      allowedRoles={["COORDINATOR"]}
    >
      <Suspense fallback={<div>Loading coordinator dashboard...</div>}>
        {children}
      </Suspense>
    </DashboardLayout>
  );
}
