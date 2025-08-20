"use client";

import { Bell, Menu, Search, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ThemeToggle } from "@/components/ui/theme-toggle";
// import { LanguageSwitcher } from "@/components/ui/language-switcher"; // Temporarily unused
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useSession } from "next-auth/react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Sidebar } from "./sidebar";
import { useState } from "react";
import { NotificationCenter } from "@/components/notifications/notification-center";
import { useAuthToast } from "@/hooks/use-auth-toast";
import { useNotifications } from "@/hooks/queries";

interface HeaderProps {
  title?: string;
}

export function Header({ title }: HeaderProps) {
  const { data: session, status } = useSession();
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const { data: notificationData } = useNotifications({ limit: 5 });
  const { signOutWithToast } = useAuthToast();

  const unreadCount = notificationData?.unreadCount || 0;

  const userName = session?.user?.name || "User";
  const userEmail = session?.user?.email || "";
  const userRole = session?.user?.role || "USER";
  const userInitials =
    userName
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase() || "U";

  console.log("Header render - session status:", status, "session:", session);

  return (
    <>
      <header className="flex-shrink-0 z-40 w-full border-b bg-background backdrop-blur supports-[backdrop-filter]:bg-background/95">
        <div className="flex h-14 items-center px-4 lg:px-6">
          {/* Mobile menu */}
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="lg:hidden">
                <Menu className="h-5 w-5" />
                <span className="sr-only">Toggle navigation menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-64 p-0">
              <Sidebar />
            </SheetContent>
          </Sheet>

          {/* Page title */}
          <div className="flex flex-1 items-center space-x-4 lg:space-x-6">
            <h1 className="text-lg font-semibold lg:text-xl">
              {title || "Dashboard"}
            </h1>
          </div>

          {/* Search */}
          <div className="hidden lg:flex lg:flex-1 lg:justify-center">
            <div className="relative w-full max-w-sm">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search..."
                className="pl-8 w-full"
              />
            </div>
          </div>

          {/* Right side */}
          <div className="flex items-center space-x-2">
            {/* Language Switcher - Temporarily disabled due to i18next issues */}
            {/* <LanguageSwitcher
              variant="compact"
              showFlag={true}
              showBadge={false}
            /> */}

            {/* Theme Toggle */}
            <ThemeToggle />

            {/* Notifications */}
            <Button
              variant="ghost"
              size="icon"
              className="relative"
              onClick={() => setIsNotificationOpen(true)}
            >
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-500 text-xs text-white flex items-center justify-center font-medium">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
              <span className="sr-only">View notifications</span>
            </Button>

            {/* User menu */}
            {status === "loading" ? (
              <div className="h-8 w-8 rounded-full bg-muted animate-pulse" />
            ) : (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className="relative h-8 w-8 rounded-full"
                  >
                    <Avatar className="h-8 w-8">
                      <AvatarImage
                        src={session?.user?.image || ""}
                        alt={userName}
                      />
                      <AvatarFallback>{userInitials}</AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">
                        {userName}
                      </p>
                      {userEmail && (
                        <p className="text-xs leading-none text-muted-foreground">
                          {userEmail}
                        </p>
                      )}
                      <p className="text-xs leading-none text-muted-foreground capitalize">
                        {String(userRole).toLowerCase()}
                      </p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem>
                    <User className="mr-2 h-4 w-4" />
                    <span>Profile</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <span>Settings</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-red-600 focus:text-red-600"
                    onClick={signOutWithToast}
                  >
                    <span>Sign out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
      </header>

      {/* Notification Center */}
      <NotificationCenter
        isOpen={isNotificationOpen}
        onClose={() => setIsNotificationOpen(false)}
      />
    </>
  );
}
