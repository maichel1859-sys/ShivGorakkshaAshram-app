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
  const { enabled, interval, onPoll, onError, adaptiveIntervals = DEFAULT_ADAPTIVE_INTERVALS } = config;
  
  const [isPolling, setIsPolling] = useState(false);
  const [currentInterval, setCurrentInterval] = useState(interval);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const isVisibleRef = useRef(true);

  const executePoll = useCallback(async () => {
    if (!enabled || !isVisibleRef.current) return;

    try {
      setIsPolling(true);
      await onPoll();
    } catch (error) {
      console.error('Polling error:', error);
      onError?.(error instanceof Error ? error : new Error('Unknown polling error'));
    } finally {
      setIsPolling(false);
    }
  }, [enabled, onPoll, onError]);

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
  };
}
