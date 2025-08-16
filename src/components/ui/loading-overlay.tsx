"use client";

import { useLoadingStore } from '@/lib/stores/loading-store';
import { Loader2 } from 'lucide-react';

interface LoadingOverlayProps {
  loadingKey?: 'globalLoading' | 'authLoading' | 'dashboardLoading' | 'appointmentsLoading' | 'queueLoading' | 'profileLoading' | 'bookingLoading' | 'checkinLoading' | 'qrScanLoading' | 'adminUsersLoading' | 'adminStatsLoading' | 'gurujiQueueLoading' | 'consultationLoading';
  message?: string;
  className?: string;
}

export function LoadingOverlay({ 
  loadingKey, 
  message = "Loading...", 
  className = "" 
}: LoadingOverlayProps) {
  const loadingStore = useLoadingStore();
  
  // If no specific key provided, check global loading
  const isLoading = loadingKey ? loadingStore[loadingKey] : loadingStore.globalLoading;

  if (!isLoading) return null;

  return (
    <div className={`fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center ${className}`}>
      <div className="flex flex-col items-center space-y-4 p-6 bg-card rounded-lg shadow-lg border">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">{message}</p>
      </div>
    </div>
  );
}

// Specific loading overlays for common use cases
export function AuthLoadingOverlay() {
  return <LoadingOverlay loadingKey="authLoading" message="Signing you in..." />;
}

export function DashboardLoadingOverlay() {
  return <LoadingOverlay loadingKey="dashboardLoading" message="Loading dashboard..." />;
}

export function AppointmentsLoadingOverlay() {
  return <LoadingOverlay loadingKey="appointmentsLoading" message="Loading appointments..." />;
}

export function QueueLoadingOverlay() {
  return <LoadingOverlay loadingKey="queueLoading" message="Loading queue..." />;
}

export function BookingLoadingOverlay() {
  return <LoadingOverlay loadingKey="bookingLoading" message="Booking appointment..." />;
}

export function CheckinLoadingOverlay() {
  return <LoadingOverlay loadingKey="checkinLoading" message="Checking in..." />;
}

export function QrScanLoadingOverlay() {
  return <LoadingOverlay loadingKey="qrScanLoading" message="Scanning QR code..." />;
}

export function GurujiQueueLoadingOverlay() {
  return <LoadingOverlay loadingKey="gurujiQueueLoading" message="Loading queue..." />;
}

export function ConsultationLoadingOverlay() {
  return <LoadingOverlay loadingKey="consultationLoading" message="Starting consultation..." />;
}
