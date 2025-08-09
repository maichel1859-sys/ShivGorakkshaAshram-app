"use client";

import { useEffect } from "react";
import { SessionProvider } from "next-auth/react";
import { ThemeProvider } from "next-themes";
import { QueryProvider } from "./query-provider";
import { LoadingProvider } from "./loading-provider";
import { Toaster } from "@/components/ui/sonner";
import { useAppStore } from "@/store/app-store";
import { useOfflineSync, useNetworkStatus, usePWA } from "@/hooks";
import { ErrorBoundary } from "@/components/error-boundary";

interface AppProvidersProps {
  children: React.ReactNode;
}

// App Initializer Component
function AppInitializer({ children }: { children: React.ReactNode }) {
  const setLoading = useAppStore((state) => state.setLoading);
  const { isOnline } = useNetworkStatus();
  const { isInstalled, canInstall } = usePWA();
  useOfflineSync(); // Initialize offline sync

  useEffect(() => {
    // Initialize app state
    setLoading(false); // App is ready

    // Log PWA status for debugging
    if (process.env.NODE_ENV === "development") {
      console.log("PWA Status:", { isInstalled, canInstall });
    }
  }, [setLoading, isInstalled, canInstall]);

  return (
    <>
      {children}

      {/* Network status indicator */}
      {!isOnline && (
        <div className="fixed bottom-4 left-4 z-50">
          <div className="bg-yellow-500 text-white px-3 py-2 rounded-lg shadow-lg text-sm">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
              <span>Working offline</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// Main App Providers Component
export function AppProviders({ children }: AppProvidersProps) {
  return (
    <ErrorBoundary>
      <QueryProvider>
        <SessionProvider>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            <LoadingProvider>
              <AppInitializer>
                {children}
                <Toaster position="top-right" richColors />
              </AppInitializer>
            </LoadingProvider>
          </ThemeProvider>
        </SessionProvider>
      </QueryProvider>
    </ErrorBoundary>
  );
}
