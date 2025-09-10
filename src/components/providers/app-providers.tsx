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
import { NetworkStatus } from "@/components/ui/network-status";
import { IOSPWAPrompt } from "@/components/ui/ios-pwa-prompt";

interface AppProvidersProps {
  children: React.ReactNode;
}

// App Initializer Component
function AppInitializer({ children }: { children: React.ReactNode }) {
  const { setLoading, setAuthLoading } = useAppStore();
  useNetworkStatus(); // Initialize network status tracking
  const { isInstalled, canInstall } = usePWA();
  useOfflineSync(); // Initialize offline sync

  useEffect(() => {
    // Initialize app state
    setLoading(false); // App is ready
    setAuthLoading(false); // Auth is ready

    // Log PWA status for debugging
    if (process.env.NODE_ENV === "development") {
      console.log("PWA Status:", { isInstalled, canInstall });
    }
  }, [setLoading, setAuthLoading, isInstalled, canInstall]);

  return (
    <>
      {children}
      
      {/* Enhanced Network Status Indicator */}
      <NetworkStatus />
      
      {/* iOS PWA Installation Prompt */}
      <IOSPWAPrompt />
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
