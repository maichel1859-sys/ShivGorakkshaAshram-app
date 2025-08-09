import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/core/auth";
import { DashboardLayout } from "@/components/dashboard/layout";
import { Suspense } from "react";

export default async function GurujiLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect("/signin");
  }

  if (session.user.role !== "GURUJI") {
    redirect("/");
  }

  return (
    <DashboardLayout title="Guruji Dashboard" allowedRoles={["GURUJI"]}>
      <Suspense fallback={<div>Loading guruji dashboard...</div>}>
        {children}
      </Suspense>
    </DashboardLayout>
  );
}
