"use client";

import { useCallback, useEffect, useRef, useState } from 'react';

export interface PollingConfig {
  enabled: boolean;
  interval: number;
  onPoll: () => Promise<void> | void;
  onError?: (error: Error) => void;
  adaptiveIntervals?: {
    IDLE?: number;
    WAITING?: number;
    NEAR_FRONT?: number;
    CONSULTATION?: number;
    BACKGROUND?: number;
  };
  // Enhanced fallback options
  fallbackMode?: boolean;
  networkAware?: boolean;
  retryOnError?: boolean;
  maxRetries?: number;
}

// Default adaptive polling intervals based on user state
const DEFAULT_ADAPTIVE_INTERVALS = {
  IDLE: 60 * 1000,        // 1 minute when not in queue
  WAITING: 15 * 1000,     // 15 seconds when in queue
  NEAR_FRONT: 10 * 1000,  // 10 seconds when position 1-3
  CONSULTATION: 5 * 1000, // 5 seconds during consultation
  BACKGROUND: 120 * 1000, // 2 minutes when app is in background
} as const;

export function useAdaptivePolling(config: PollingConfig) {
  const {
    enabled,
    interval,
    onPoll,
    onError,
    adaptiveIntervals = DEFAULT_ADAPTIVE_INTERVALS,
    retryOnError = true,
    maxRetries = 3
  } = config;

  const [isPolling, setIsPolling] = useState(false);
  const [currentInterval, setCurrentInterval] = useState(interval);
  const [retryCount, setRetryCount] = useState(0);
  const [lastError, setLastError] = useState<Error | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const isVisibleRef = useRef(true);

  // Function to determine appropriate polling interval based on user state
  const getAdaptiveInterval = useCallback((userState?: 'IDLE' | 'WAITING' | 'NEAR_FRONT' | 'CONSULTATION') => {
    if (!isVisibleRef.current) {
      return adaptiveIntervals.BACKGROUND || interval;
    }
    
    switch (userState) {
      case 'CONSULTATION':
        return adaptiveIntervals.CONSULTATION || interval;
      case 'NEAR_FRONT':
        return adaptiveIntervals.NEAR_FRONT || interval;
      case 'WAITING':
        return adaptiveIntervals.WAITING || interval;
      case 'IDLE':
      default:
        return adaptiveIntervals.IDLE || interval;
    }
  }, [adaptiveIntervals, interval]);

  const executePoll = useCallback(async () => {
    if (!enabled || !isVisibleRef.current) return;

    try {
      setIsPolling(true);
      await onPoll();

      // Reset retry count on successful poll
      if (retryCount > 0) {
        setRetryCount(0);
        setLastError(null);
      }
    } catch (error) {
      const pollError = error instanceof Error ? error : new Error('Unknown polling error');
      setLastError(pollError);

      console.warn(`🔌 Polling error (attempt ${retryCount + 1}/${maxRetries}):`, pollError.message);

      if (retryOnError && retryCount < maxRetries) {
        setRetryCount(prev => prev + 1);

        // Exponential backoff for retries
        const retryDelay = Math.min(1000 * Math.pow(2, retryCount), 10000);

        setTimeout(() => {
          if (enabled && isVisibleRef.current) {
            executePoll();
          }
        }, retryDelay);
      } else {
        // Max retries reached or retry disabled
        onError?.(pollError);
        setRetryCount(0);
      }
    } finally {
      setIsPolling(false);
    }
  }, [enabled, onPoll, onError, retryOnError, retryCount, maxRetries]);

  // Method to update polling interval based on user state
  const updatePollingInterval = useCallback((userState?: 'IDLE' | 'WAITING' | 'NEAR_FRONT' | 'CONSULTATION') => {
    const newInterval = getAdaptiveInterval(userState);
    if (newInterval !== currentInterval) {
      setCurrentInterval(newInterval);
      if (intervalRef.current) {
        // Restart polling with new interval
        clearInterval(intervalRef.current);
        intervalRef.current = setInterval(executePoll, newInterval);
      }
    }
  }, [getAdaptiveInterval, currentInterval, executePoll]);

  const startPolling = useCallback(() => {
    if (!enabled || intervalRef.current) return;

    intervalRef.current = setInterval(executePoll, currentInterval);
  }, [enabled, currentInterval, executePoll]);

  const stopPolling = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const restartPolling = useCallback(() => {
    stopPolling();
    startPolling();
  }, [stopPolling, startPolling]);

  // Handle visibility change
  useEffect(() => {
    const handleVisibilityChange = () => {
      isVisibleRef.current = !document.hidden;
      if (isVisibleRef.current) {
        // Resume polling when page becomes visible
        restartPolling();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [restartPolling]);

  const updateInterval = useCallback((newInterval: number) => {
    setCurrentInterval(newInterval);
    if (intervalRef.current) {
      restartPolling();
    }
  }, [restartPolling]);

  // Start/stop polling based on enabled state
  useEffect(() => {
    if (enabled) {
      startPolling();
    } else {
      stopPolling();
    }

    return () => {
      stopPolling();
    };
  }, [enabled, startPolling, stopPolling]);

  // Update interval when config changes
  useEffect(() => {
    setCurrentInterval(interval);
  }, [interval]);

  return {
    isPolling,
    currentInterval,
    startPolling,
    stopPolling,
    restartPolling,
    updateInterval,
    // Enhanced status information
    retryCount,
    lastError,
    isRetrying: retryCount > 0,
    health: {
      isHealthy: retryCount === 0 && !lastError,
      errorRate: retryCount / maxRetries,
      lastSuccessfulPoll: retryCount === 0 ? Date.now() : null,
    },
    updatePollingInterval,
    getAdaptiveInterval,
  };
}
