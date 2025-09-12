"use client";

import { useSession } from "next-auth/react";

interface HeaderProps {
  title?: string;
}

export function HeaderSimple({ title }: HeaderProps) {
  const { data: session, status } = useSession();

  console.log(
    "HeaderSimple render - session status:",
    status,
    "session:",
    session
  );

  return (
    <header className="flex-shrink-0 z-40 w-full border-b bg-background backdrop-blur supports-[backdrop-filter]:bg-background/95">
      <div className="flex h-14 items-center px-3 sm:px-4 lg:px-6">
        <div className="flex flex-1 items-center space-x-2 sm:space-x-4 lg:space-x-6">
          <h1 className="text-base sm:text-lg font-semibold lg:text-xl text-foreground truncate">
            {title || "Dashboard"}
          </h1>
        </div>
        <div className="flex items-center space-x-1 sm:space-x-2">
          <div className="text-xs sm:text-sm text-muted-foreground truncate max-w-32 sm:max-w-none">
            {session?.user?.name || "Guest"}
          </div>
        </div>
      </div>
    </header>
  );
}
