"use client";

import { ReactNode } from "react";
import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import { Sidebar } from "./sidebar";
import { Header } from "./header";
import { Role } from "@prisma/client";

interface DashboardLayoutProps {
  children: ReactNode;
  title?: string;
  allowedRoles?: Role[];
}

export function DashboardLayout({
  children,
  title,
  allowedRoles = ["USER", "COORDINATOR", "GURUJI", "ADMIN"],
}: DashboardLayoutProps) {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!session?.user) {
    redirect("/signin");
  }

  if (!allowedRoles.includes(session.user.role)) {
    redirect("/unauthorized");
  }

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar for desktop */}
      <aside className="hidden lg:block w-64 border-r bg-background flex-shrink-0">
        <Sidebar />
      </aside>

      {/* Main content area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Fixed Header */}
        <Header title={title} />

        {/* Scrollable Page content */}
        <main className="flex-1 overflow-y-auto bg-muted/10 scroll-smooth">
          <div className="container max-w-7xl mx-auto py-6 px-4 lg:px-8 min-h-full">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
