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
} from "lucide-react";
import { Role } from "@prisma/client";

interface NavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  roles: Role[];
}

const navItems: NavItem[] = [
  {
    title: "Dashboard",
    href: "/dashboard",
    icon: Home,
    roles: ["USER", "COORDINATOR", "GURUJI", "ADMIN"],
  },
  {
    title: "Appointments",
    href: "/appointments",
    icon: Calendar,
    roles: ["USER", "COORDINATOR", "GURUJI", "ADMIN"],
  },
  {
    title: "Queue",
    href: "/queue",
    icon: Clock,
    roles: ["USER", "COORDINATOR", "GURUJI", "ADMIN"],
  },
  {
    title: "Check-in",
    href: "/checkin",
    icon: QrCode,
    roles: ["USER", "COORDINATOR"],
  },
  {
    title: "Consultations",
    href: "/consultations",
    icon: UserCheck,
    roles: ["GURUJI", "COORDINATOR", "ADMIN"],
  },
  {
    title: "Remedies",
    href: "/remedies",
    icon: Heart,
    roles: ["GURUJI", "COORDINATOR", "ADMIN"],
  },
  {
    title: "Users",
    href: "/users",
    icon: Users,
    roles: ["COORDINATOR", "ADMIN"],
  },
  {
    title: "Reports",
    href: "/reports",
    icon: BarChart3,
    roles: ["COORDINATOR", "ADMIN"],
  },
  {
    title: "System",
    href: "/system",
    icon: Shield,
    roles: ["ADMIN"],
  },
  {
    title: "API Docs",
    href: "/api-docs",
    icon: FileText,
    roles: ["ADMIN"],
  },
  {
    title: "Socket Monitor",
    href: "/socket-monitor",
    icon: Activity,
    roles: ["ADMIN"],
  },
  {
    title: "Settings",
    href: "/settings",
    icon: Settings,
    roles: ["USER", "COORDINATOR", "GURUJI", "ADMIN"],
  },
];

export function Sidebar({ className }: React.HTMLAttributes<HTMLDivElement>) {
  const { data: session } = useSession();
  const pathname = usePathname();

  if (!session?.user) return null;

  const userRole = session.user.role;
  const filteredNavItems = navItems.filter((item) =>
    item.roles.includes(userRole)
  );

  const handleSignOut = () => {
    signOut({ callbackUrl: "/" });
  };

  return (
    <div className={cn("pb-12", className)}>
      <div className="space-y-4 py-4">
        <div className="px-3 py-2">
          <div className="flex items-center space-x-2 mb-4">
            <Heart className="h-6 w-6 text-primary" />
            <h2 className="text-lg font-semibold tracking-tight">Ashram MS</h2>
          </div>
          <div className="space-y-1">
            {filteredNavItems.map((item) => {
              const navPath =
                item.href === "/dashboard"
                  ? `/${userRole.toLowerCase()}`
                  : `/${userRole.toLowerCase()}${item.href}`;
              const isActive = pathname && pathname.startsWith(navPath);

              return (
                <Button
                  key={item.href}
                  variant={isActive ? "secondary" : "ghost"}
                  className={cn(
                    "w-full justify-start",
                    isActive && "bg-muted font-medium"
                  )}
                  asChild
                >
                  <Link
                    href={
                      item.href === "/dashboard"
                        ? `/${userRole.toLowerCase()}`
                        : `/${userRole.toLowerCase()}${item.href}`
                    }
                  >
                    <item.icon className="mr-2 h-4 w-4" />
                    {item.title}
                  </Link>
                </Button>
              );
            })}
          </div>
        </div>
        <Separator />
        <div className="px-3 py-2">
          <div className="space-y-2">
            <div className="px-3 py-2 text-sm">
              <div className="font-medium">{session.user.name}</div>
              <div className="text-xs text-muted-foreground">
                {session.user.email}
              </div>
              <div className="text-xs text-muted-foreground capitalize">
                {userRole.toLowerCase()}
              </div>
            </div>
            <Button
              variant="ghost"
              className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50"
              onClick={handleSignOut}
            >
              <LogOut className="mr-2 h-4 w-4" />
              Sign Out
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
