"use client";

import { cn } from "@/lib/utils/helpers";
import { useAuthToast } from "@/hooks/use-auth-toast";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useSession } from "next-auth/react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { useLanguage } from "@/contexts/LanguageContext";
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
  Bell,
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
    title: "QR Codes",
    href: "/admin/qr-codes",
    icon: QrCode,
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
    title: "Reception Desk",
    href: "/coordinator/reception",
    icon: Users,
    roles: ["COORDINATOR"],
    badge: "Live",
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
    title: "Remedies",
    href: "/guruji/remedies",
    icon: Heart,
    roles: ["GURUJI"],
  },
  {
    title: "Settings",
    href: "/guruji/settings",
    icon: Settings,
    roles: ["GURUJI"],
  },
];

export function Sidebar({ className }: React.HTMLAttributes<HTMLDivElement>) {
  const { data: session } = useSession();
  const pathname = usePathname();
  const { signOutWithToast } = useAuthToast();
  const { t } = useLanguage();

  const handleSignOut = () => {
    signOutWithToast();
  };

  if (!session?.user) {
    return null;
  }

  const userRole = session.user.role as AppRole;

  // Translate navigation items
  const getTranslatedTitle = (title: string) => {
    const titleMap: Record<string, string> = {
      Dashboard: t("nav.dashboard", "Dashboard"),
      Users: t("nav.users", "Users"),
      Appointments: t("nav.appointments", "Appointments"),
      Queue: t("nav.queue", "Queue"),
      Consultations: t("nav.consultations", "Consultations"),
      Remedies: t("nav.remedies", "Remedies"),
      Reports: t("nav.reports", "Reports"),
      System: t("nav.system", "System"),
      "QR Codes": t("nav.qrCodes", "QR Codes"),
      Database: t("nav.database", "Database"),
      Monitoring: t("nav.monitoring", "Monitoring"),
      Settings: t("nav.settings", "Settings"),
      Notifications: t("nav.notifications", "Notifications"),
      Performance: t("nav.performance", "Performance"),
      "Book Appointment": t("nav.bookAppointment", "Book Appointment"),
      "My Remedies": t("nav.myRemedies", "My Remedies"),
      "QR Scanner": t("nav.qrScanner", "QR Scanner"),
      "My Appointments": t("nav.myAppointments", "My Appointments"),
      "Reception Desk": t("nav.reception", "Reception Desk"),
      "Queue Management": t("nav.queueManagement", "Queue Management"),
    };
    return titleMap[title] || title;
  };

  const filteredNavItems = navItems.filter((item) =>
    item.roles.includes(userRole)
  );

  // Group items by category for better organization
  const mainItems = filteredNavItems.filter(
    (item) =>
      !item.title.includes("System") &&
      !item.title.includes("API") &&
      true &&
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
      false ||
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
        "flex h-full w-64 flex-col bg-sidebar border-r border-sidebar-border",
        "lg:w-72 xl:w-80", // Responsive widths
        "shadow-lg lg:shadow-xl", // Subtle shadows
        className
      )}
    >
      {/* Logo/Brand */}
      <div className="flex h-16 items-center border-b border-sidebar-border px-4 sm:px-6">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="w-8 h-8 sm:w-10 sm:h-10 bg-sidebar-primary rounded-xl flex items-center justify-center shadow-sm">
            <span className="text-sidebar-primary-foreground text-sm sm:text-lg font-bold">
              S
            </span>
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="font-bold text-sm sm:text-base lg:text-lg text-sidebar-foreground truncate">
              ShivGoraksha Ashram
            </h1>
            <p className="text-xs text-sidebar-foreground/70 truncate">
              Spiritual Management System
            </p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-auto py-4">
        <nav className="space-y-2 px-3">
          {/* Main Navigation */}
          {mainItems.length > 0 && (
            <>
              <div className="mb-6">
                <h3 className="text-xs font-semibold text-sidebar-foreground/70 uppercase tracking-wider px-3 mb-3">
                  {t("nav.main", "Main")}
                </h3>
                {mainItems.map((item) => {
                  const isActive = pathname === item.href;
                  return (
                    <Link key={item.href} href={item.href}>
                      <Button
                        variant={isActive ? "secondary" : "ghost"}
                        className={cn(
                          "w-full justify-start gap-2 sm:gap-3 h-10 sm:h-11 rounded-xl",
                          "transition-all duration-200",
                          "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                          isActive
                            ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-sm border border-sidebar-accent/20"
                            : "hover:shadow-sm"
                        )}
                      >
                        <item.icon className="h-4 w-4" />
                        <span className="flex-1 text-left text-sm sm:text-base truncate">
                          {getTranslatedTitle(item.title)}
                        </span>
                        {item.badge && (
                          <span className="ml-auto bg-sidebar-primary text-sidebar-primary-foreground text-xs px-2 py-1 rounded-full shadow-sm">
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
              <div className="mb-6">
                <h3 className="text-xs font-semibold text-sidebar-foreground/70 uppercase tracking-wider px-3 mb-3">
                  {t("nav.systemTechnical", "System & Technical")}
                </h3>
                {systemItems.map((item) => {
                  const isActive = pathname === item.href;
                  return (
                    <Link key={item.href} href={item.href}>
                      <Button
                        variant={isActive ? "secondary" : "ghost"}
                        className={cn(
                          "w-full justify-start gap-2 sm:gap-3 h-10 sm:h-11 rounded-xl",
                          "transition-all duration-200",
                          "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                          isActive
                            ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-sm border border-sidebar-accent/20"
                            : "hover:shadow-sm"
                        )}
                      >
                        <item.icon className="h-4 w-4" />
                        <span className="flex-1 text-left text-sm sm:text-base truncate">
                          {getTranslatedTitle(item.title)}
                        </span>
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
              <div className="mb-6">
                <h3 className="text-xs font-semibold text-sidebar-foreground/70 uppercase tracking-wider px-3 mb-3">
                  {t("nav.configuration", "Configuration")}
                </h3>
                {configItems.map((item) => {
                  const isActive = pathname === item.href;
                  return (
                    <Link key={item.href} href={item.href}>
                      <Button
                        variant={isActive ? "secondary" : "ghost"}
                        className={cn(
                          "w-full justify-start gap-2 sm:gap-3 h-10 sm:h-11 rounded-xl",
                          "transition-all duration-200",
                          "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                          isActive
                            ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-sm border border-sidebar-accent/20"
                            : "hover:shadow-sm"
                        )}
                      >
                        <item.icon className="h-4 w-4" />
                        <span className="flex-1 text-left text-sm sm:text-base truncate">
                          {getTranslatedTitle(item.title)}
                        </span>
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
      <div className="border-t border-sidebar-border p-3 sm:p-4">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="w-8 h-8 sm:w-10 sm:h-10 bg-sidebar-primary/10 rounded-xl flex items-center justify-center shadow-sm">
            <Users className="h-4 w-4 sm:h-5 sm:w-5 text-sidebar-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs sm:text-sm font-medium truncate text-sidebar-foreground">
              {session.user.name || "User"}
            </p>
            <p className="text-xs text-sidebar-foreground/70 truncate">
              {session.user.email}
            </p>
            <Badge
              variant="outline"
              className="text-xs mt-1 border-sidebar-border text-sidebar-foreground/80"
            >
              {session.user.role}
            </Badge>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSignOut}
            className="h-8 w-8 sm:h-9 sm:w-9 p-0 rounded-xl hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-all duration-200"
          >
            <LogOut className="h-3 w-3 sm:h-4 sm:w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
