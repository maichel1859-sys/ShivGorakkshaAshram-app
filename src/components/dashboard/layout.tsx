"use client";

import { useEffect } from "react";
import { useAppStore } from '@/store/app-store';
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Sidebar } from "./sidebar";
import { Header } from "./header";
import { GlobalSpinner } from "@/components/loading";

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
  const { setLoadingState, loadingStates } = useAppStore();
  const isLoading = loadingStates['dashboard-layout'] || false;

  useEffect(() => {
    if (status === "loading") {
      setLoadingState('dashboard-layout', true);
    } else if (status === "unauthenticated") {
      router.push("/signin");
    } else if (status === "authenticated") {
      if (!allowedRoles.includes(session?.user?.role || "")) {
        router.push("/unauthorized");
      } else {
        setLoadingState('dashboard-layout', false);
      }
    }
  }, [status, session, router, allowedRoles, setLoadingState]);

  if (isLoading || status === "loading") {
    return <GlobalSpinner size="xl" message="Loading dashboard..." fullScreen />;
  }

  if (!session?.user) {
    return null;
  }

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar - Hidden on mobile, visible on desktop */}
      <div className="hidden lg:block">
        <Sidebar />
      </div>
      
      {/* Main content area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header title={title} />
        <main className="flex-1 overflow-y-auto p-3 sm:p-4 lg:p-8 bg-muted/20 mobile-scroll">
          <div className="max-w-7xl mx-auto w-full">
            <div className="section-spacing">
              {children}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
