import { Suspense } from "react";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/core/auth";

export default async function AdminLayout({
  children,
  modal,
}: {
  children: React.ReactNode;
  modal: React.ReactNode;
  stats: React.ReactNode;
  alerts: React.ReactNode;
  recent: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect("/auth/signin");
  }

  if (session.user.role !== "ADMIN") {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Main content */}
      <div className="container mx-auto py-6">
        <Suspense fallback={<div>Loading admin dashboard...</div>}>
          {children}
        </Suspense>
      </div>

      {/* Parallel route for modals */}
      <Suspense fallback={null}>{modal}</Suspense>
    </div>
  );
}
