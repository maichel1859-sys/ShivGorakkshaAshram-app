"use client";

import { useEffect } from "react";
import { SessionProvider } from "next-auth/react";
import { Toaster } from "react-hot-toast";
import { useAppStore } from "@/store/app-store";

import { useOfflineSync } from "@/hooks/use-offline-sync";
import { ErrorBoundary } from "@/components/error-boundary";

interface AppProvidersProps {
  children: React.ReactNode;
}

function AppInitializer({ children }: { children: React.ReactNode }) {
  const initializeApp = useAppStore((state) => state.initializeApp);
  const setNetworkStatus = useAppStore((state) => state.setNetworkStatus);
  const { isOnline } = useAppStore((state) => state.network);
  useOfflineSync(); // Initialize offline sync

  useEffect(() => {
    // Initialize app state
    initializeApp();

    // Set up network status monitoring
    const updateNetworkStatus = () => {
      setNetworkStatus(navigator.onLine);
    };

    window.addEventListener("online", updateNetworkStatus);
    window.addEventListener("offline", updateNetworkStatus);

    return () => {
      window.removeEventListener("online", updateNetworkStatus);
      window.removeEventListener("offline", updateNetworkStatus);
    };
  }, [initializeApp, setNetworkStatus]);

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

export function AppProviders({ children }: AppProvidersProps) {
  return (
    <ErrorBoundary>
      <SessionProvider>
        <AppInitializer>
          {children}
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: {
                background: "#333",
                color: "#fff",
              },
              success: {
                duration: 3000,
                iconTheme: {
                  primary: "#10b981",
                  secondary: "#fff",
                },
              },
              error: {
                duration: 5000,
                iconTheme: {
                  primary: "#ef4444",
                  secondary: "#fff",
                },
              },
            }}
          />
        </AppInitializer>
      </SessionProvider>
    </ErrorBoundary>
  );
}
