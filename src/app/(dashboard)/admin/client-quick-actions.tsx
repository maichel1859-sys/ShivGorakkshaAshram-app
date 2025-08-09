"use client";

import { useRouter } from "next/navigation";
import { QuickActions } from "@/components/dashboard/shared/quick-actions";
import { Users, CalendarDays, Cog, BarChart3 } from "lucide-react";

export function ClientQuickActions() {
  const router = useRouter();
  const actions = [
    {
      id: "manage-users",
      title: "Manage Users",
      description: "View and manage user accounts",
      onClick: () => router.push("/admin/users"),
      icon: Users,
    },
    {
      id: "view-appointments",
      title: "View Appointments",
      description: "Monitor appointment bookings",
      onClick: () => router.push("/admin/appointments"),
      icon: CalendarDays,
    },
    {
      id: "system-settings",
      title: "System Settings",
      description: "Configure system preferences",
      onClick: () => router.push("/admin/settings"),
      icon: Cog,
    },
    {
      id: "generate-reports",
      title: "Generate Reports",
      description: "Create and export reports",
      onClick: () => router.push("/admin/reports"),
      icon: BarChart3,
    },
  ];
  return <QuickActions actions={actions} />;
}

 