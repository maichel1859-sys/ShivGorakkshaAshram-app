"use client";

import { cn } from "@/lib/utils/helpers";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useSession, signOut } from "next-auth/react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import {
  Calendar,
  Clock,
  Heart,
  Home,
  LogOut,
  Settings,
  Users,
  QrCode,
  UserCheck,
  Shield,
  BarChart3,
  Activity,
  FileText,
  Database,
  Monitor,
  Bell,
  Zap,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

// Avoid importing Prisma types on the client; define app roles locally
type AppRole = "ADMIN" | "USER" | "COORDINATOR" | "GURUJI";

interface NavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  roles: AppRole[];
  badge?: string;
}

const navItems: NavItem[] = [
  // Main Admin routes
  {
    title: "Dashboard",
    href: "/admin",
    icon: Home,
    roles: ["ADMIN"],
  },
  {
    title: "Users",
    href: "/admin/users",
    icon: Users,
    roles: ["ADMIN"],
    badge: "155",
  },
  {
    title: "Appointments",
    href: "/admin/appointments",
    icon: Calendar,
    roles: ["ADMIN"],
    badge: "158",
  },
  {
    title: "Queue",
    href: "/admin/queue",
    icon: Clock,
    roles: ["ADMIN"],
    badge: "13",
  },
  {
    title: "Consultations",
    href: "/admin/consultations",
    icon: UserCheck,
    roles: ["ADMIN"],
  },
  {
    title: "Remedies",
    href: "/admin/remedies",
    icon: Heart,
    roles: ["ADMIN"],
  },
  {
    title: "Reports",
    href: "/admin/reports",
    icon: BarChart3,
    roles: ["ADMIN"],
  },

  // System & Technical
  {
    title: "System",
    href: "/admin/system",
    icon: Shield,
    roles: ["ADMIN"],
  },
  {
    title: "API Docs",
    href: "/admin/api-docs",
    icon: FileText,
    roles: ["ADMIN"],
  },
  {
    title: "Socket Monitor",
    href: "/admin/socket-monitor",
    icon: Activity,
    roles: ["ADMIN"],
  },
  {
    title: "Database",
    href: "/admin/database",
    icon: Database,
    roles: ["ADMIN"],
  },
  {
    title: "Monitoring",
    href: "/admin/monitoring",
    icon: Monitor,
    roles: ["ADMIN"],
  },

  // Settings & Configuration
  {
    title: "Settings",
    href: "/admin/settings",
    icon: Settings,
    roles: ["ADMIN"],
  },
  {
    title: "Notifications",
    href: "/admin/notifications",
    icon: Bell,
    roles: ["ADMIN"],
  },
  {
    title: "Performance",
    href: "/admin/performance",
    icon: Zap,
    roles: ["ADMIN"],
  },

  // User routes
  {
    title: "Dashboard",
    href: "/user",
    icon: Home,
    roles: ["USER"],
  },
  {
    title: "Appointments",
    href: "/user/appointments",
    icon: Calendar,
    roles: ["USER"],
  },
  {
    title: "Book Appointment",
    href: "/user/appointments/book",
    icon: Calendar,
    roles: ["USER"],
  },
  {
    title: "My Queue",
    href: "/user/queue",
    icon: Clock,
    roles: ["USER"],
  },
  {
    title: "My Remedies",
    href: "/user/remedies",
    icon: Heart,
    roles: ["USER"],
  },
  {
    title: "QR Scanner",
    href: "/user/qr-scanner",
    icon: QrCode,
    roles: ["USER"],
  },

  // Coordinator routes
  {
    title: "Dashboard",
    href: "/coordinator",
    icon: Home,
    roles: ["COORDINATOR"],
  },
  {
    title: "Queue Management",
    href: "/coordinator/queue",
    icon: Clock,
    roles: ["COORDINATOR"],
  },
  {
    title: "Appointments",
    href: "/coordinator/appointments",
    icon: Calendar,
    roles: ["COORDINATOR"],
  },

  // Guruji routes
  {
    title: "Dashboard",
    href: "/guruji",
    icon: Home,
    roles: ["GURUJI"],
  },
  {
    title: "My Appointments",
    href: "/guruji/appointments",
    icon: Calendar,
    roles: ["GURUJI"],
  },
  {
    title: "My Queue",
    href: "/guruji/queue",
    icon: Clock,
    roles: ["GURUJI"],
  },
  {
    title: "Remedies",
    href: "/guruji/remedies",
    icon: Heart,
    roles: ["GURUJI"],
  },
];

export function Sidebar({ className }: React.HTMLAttributes<HTMLDivElement>) {
  const { data: session } = useSession();
  const pathname = usePathname();

  const handleSignOut = () => {
    signOut({ callbackUrl: "/" });
  };

  if (!session?.user) {
    return null;
  }

  const userRole = session.user.role as AppRole;
  const filteredNavItems = navItems.filter((item) =>
    item.roles.includes(userRole)
  );

  // Group items by category for better organization
  const mainItems = filteredNavItems.filter(
    (item) =>
      !item.title.includes("System") &&
      !item.title.includes("API") &&
      !item.title.includes("Socket") &&
      !item.title.includes("Database") &&
      !item.title.includes("Monitoring") &&
      !item.title.includes("Settings") &&
      !item.title.includes("Notifications") &&
      !item.title.includes("Performance")
  );

  const systemItems = filteredNavItems.filter(
    (item) =>
      item.title.includes("System") ||
      item.title.includes("API") ||
      item.title.includes("Socket") ||
      item.title.includes("Database") ||
      item.title.includes("Monitoring")
  );

  const configItems = filteredNavItems.filter(
    (item) =>
      item.title.includes("Settings") ||
      item.title.includes("Notifications") ||
      item.title.includes("Performance")
  );

  return (
    <div
      className={cn(
        "flex h-full w-64 flex-col bg-background border-r",
        className
      )}
    >
      {/* Logo/Brand */}
      <div className="flex h-16 items-center border-b px-6">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <Heart className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="font-bold text-lg">Ashram MS</h1>
            <p className="text-xs text-muted-foreground">Management System</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-auto py-4">
        <nav className="space-y-1 px-3">
          {/* Main Navigation */}
          {mainItems.length > 0 && (
            <>
              <div className="mb-4">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-3 mb-2">
                  Main
                </h3>
                {mainItems.map((item) => {
                  const isActive = pathname === item.href;
                  return (
                    <Link key={item.href} href={item.href}>
                      <Button
                        variant={isActive ? "secondary" : "ghost"}
                        className={cn(
                          "w-full justify-start gap-3 h-10",
                          isActive && "bg-secondary text-secondary-foreground"
                        )}
                      >
                        <item.icon className="h-4 w-4" />
                        <span className="flex-1 text-left">{item.title}</span>
                        {item.badge && (
                          <span className="ml-auto bg-primary text-primary-foreground text-xs px-2 py-1 rounded-full">
                            {item.badge}
                          </span>
                        )}
                      </Button>
                    </Link>
                  );
                })}
              </div>
            </>
          )}

          {/* System & Technical */}
          {systemItems.length > 0 && (
            <>
              <Separator className="my-4" />
              <div className="mb-4">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-3 mb-2">
                  System & Technical
                </h3>
                {systemItems.map((item) => {
                  const isActive = pathname === item.href;
                  return (
                    <Link key={item.href} href={item.href}>
                      <Button
                        variant={isActive ? "secondary" : "ghost"}
                        className={cn(
                          "w-full justify-start gap-3 h-10",
                          isActive && "bg-secondary text-secondary-foreground"
                        )}
                      >
                        <item.icon className="h-4 w-4" />
                        <span className="flex-1 text-left">{item.title}</span>
                      </Button>
                    </Link>
                  );
                })}
              </div>
            </>
          )}

          {/* Configuration */}
          {configItems.length > 0 && (
            <>
              <Separator className="my-4" />
              <div className="mb-4">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-3 mb-2">
                  Configuration
                </h3>
                {configItems.map((item) => {
                  const isActive = pathname === item.href;
                  return (
                    <Link key={item.href} href={item.href}>
                      <Button
                        variant={isActive ? "secondary" : "ghost"}
                        className={cn(
                          "w-full justify-start gap-3 h-10",
                          isActive && "bg-secondary text-secondary-foreground"
                        )}
                      >
                        <item.icon className="h-4 w-4" />
                        <span className="flex-1 text-left">{item.title}</span>
                      </Button>
                    </Link>
                  );
                })}
              </div>
            </>
          )}
        </nav>
      </div>

      {/* User Profile */}
      <div className="border-t p-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
            <Users className="h-4 w-4 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">
              {session.user.name || "User"}
            </p>
            <p className="text-xs text-muted-foreground truncate">
              {session.user.email}
            </p>
            <Badge variant="outline" className="text-xs mt-1">
              {session.user.role}
            </Badge>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSignOut}
            className="h-8 w-8 p-0"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
