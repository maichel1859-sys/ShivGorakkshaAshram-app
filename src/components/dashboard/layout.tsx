"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Sidebar } from "./sidebar";
import { Header } from "./header";
import { GlobalSpinner } from "@/components/ui/global-spinner";

interface DashboardLayoutProps {
  children: React.ReactNode;
  title?: string;
  allowedRoles?: string[];
}

export function DashboardLayout({ 
  children, 
  title,
  allowedRoles = ["USER", "ADMIN", "GURUJI", "COORDINATOR"]
}: DashboardLayoutProps) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (status === "loading") {
      setIsLoading(true);
    } else if (status === "unauthenticated") {
      router.push("/signin");
    } else if (status === "authenticated") {
      if (!allowedRoles.includes(session?.user?.role || "")) {
        router.push("/unauthorized");
      } else {
        setIsLoading(false);
      }
    }
  }, [status, session, router, allowedRoles]);

  if (isLoading || status === "loading") {
    return <GlobalSpinner size="xl" message="Loading dashboard..." fullScreen />;
  }

  if (!session?.user) {
    return null;
  }

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header title={title} />
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
