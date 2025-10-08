"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clock, Play, Pause, User } from "lucide-react";
import { SimpleCompleteButton } from "./complete-consultation-button";
import { useSocket, SocketEvents } from "@/lib/socket/socket-client";
import { updateConsultation } from "@/lib/actions/consultation-actions";
import { toast } from "sonner";
import { cn } from "@/lib/utils/helpers";
import { formatAppointmentTime } from "@/lib/utils/time-formatting";

interface ConsultationSession {
  id: string;
  appointmentId: string;
  devoteeId: string;
  gurujiId: string;
  startTime: string;
  endTime?: string;
  duration?: number;
  devotee: {
    id: string;
    name: string | null;
    phone: string | null;
  };
}

interface ConsultationTimerProps {
  consultation: ConsultationSession;
  onUpdate?: (consultation: ConsultationSession) => void;
  onPrescribeAndComplete?: () => void;
  onSkipAndComplete?: () => void;
}

export function ConsultationTimer({
  consultation,
  onUpdate,
  onPrescribeAndComplete,
  onSkipAndComplete
}: ConsultationTimerProps) {
  const { socket } = useSocket();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isPaused, setIsPaused] = useState(false);
  const [totalPausedTime, setTotalPausedTime] = useState(0);
  const [pauseStartTime, setPauseStartTime] = useState<Date | null>(null);

  // Calculate elapsed time
  const startTime = useMemo(() => new Date(consultation.startTime), [consultation.startTime]);
  const endTime = useMemo(() => consultation.endTime ? new Date(consultation.endTime) : null, [consultation.endTime]);
  
  const calculateElapsedTime = useCallback(() => {
    const now = endTime || currentTime;
    const elapsed = Math.floor((now.getTime() - startTime.getTime()) / 1000); // in seconds
    const adjustedElapsed = Math.max(0, elapsed - totalPausedTime);
    return adjustedElapsed;
  }, [currentTime, endTime, startTime, totalPausedTime]);

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Update timer every second
  useEffect(() => {
    if (consultation.endTime) return; // Don't update if consultation is completed

    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(interval);
  }, [consultation.endTime]);

  // Socket listeners for real-time updates
  useEffect(() => {
    const handleConsultationUpdate = (...args: unknown[]) => {
      const data = args[0] as {
        consultationId: string;
        action: string;
        timestamp: string;
        elapsedTime?: number;
        duration?: number;
        devoteeName?: string;
        gurujiId?: string;
      };
      if (data.consultationId === consultation.id) {
        console.log('🔌 Received consultation update:', data);
        
        if (data.action === 'paused') {
          setIsPaused(true);
          setPauseStartTime(new Date(data.timestamp));
        } else if (data.action === 'resumed') {
          setIsPaused(false);
          if (pauseStartTime) {
            const pauseDuration = Math.floor((new Date(data.timestamp).getTime() - pauseStartTime.getTime()) / 1000);
            setTotalPausedTime(prev => prev + pauseDuration);
          }
          setPauseStartTime(null);
        } else if (data.action === 'completed') {
          // Update consultation with final duration
          if (onUpdate) {
            onUpdate({
              ...consultation,
              endTime: data.timestamp,
              duration: Math.floor(calculateElapsedTime() / 60) // in minutes
            });
          }
        }
      }
    };

    socket.on(SocketEvents.CONSULTATION_UPDATE, handleConsultationUpdate);

    return () => {
      socket.off(SocketEvents.CONSULTATION_UPDATE, handleConsultationUpdate);
    };
  }, [socket, consultation.id, pauseStartTime, onUpdate, calculateElapsedTime, consultation]);

  // Broadcast timer updates to other clients every 10 seconds
  useEffect(() => {
    if (consultation.endTime || isPaused) return;

    const interval = setInterval(() => {
      const elapsed = calculateElapsedTime();
      socket.emit(SocketEvents.CONSULTATION_UPDATE, {
        consultationId: consultation.id,
        action: 'timer_update',
        elapsedTime: elapsed,
        timestamp: new Date().toISOString(),
        devoteeName: consultation.devotee.name,
        gurujiId: consultation.gurujiId
      });
    }, 10000); // Every 10 seconds

    return () => clearInterval(interval);
  }, [socket, consultation, isPaused, totalPausedTime, calculateElapsedTime]);

  const handlePauseResume = async () => {
    try {
      const action = isPaused ? 'resumed' : 'paused';
      const timestamp = new Date().toISOString();

      if (!isPaused) {
        // Pausing
        setIsPaused(true);
        setPauseStartTime(new Date());
      } else {
        // Resuming
        setIsPaused(false);
        if (pauseStartTime) {
          const pauseDuration = Math.floor((new Date().getTime() - pauseStartTime.getTime()) / 1000);
          setTotalPausedTime(prev => prev + pauseDuration);
        }
        setPauseStartTime(null);
      }

      // Broadcast to other clients
      socket.emit(SocketEvents.CONSULTATION_UPDATE, {
        consultationId: consultation.id,
        action,
        timestamp,
        devoteeName: consultation.devotee.name,
        gurujiId: consultation.gurujiId
      });

      toast.success(`Timer ${action}`);
    } catch (error) {
      console.error('Error handling timer pause/resume:', error);
      toast.error('Failed to update timer');
    }
  };

  const handleCompleteConsultation = async () => {
    try {
      const finalDuration = Math.floor(calculateElapsedTime() / 60); // in minutes
      const timestamp = new Date().toISOString();

      const formData = new FormData();
      formData.append('consultationId', consultation.id);
      formData.append('status', 'COMPLETED');
      
      const result = await updateConsultation(formData);
      
      if (result.success) {
        // Broadcast completion to other clients
        socket.emit(SocketEvents.CONSULTATION_UPDATE, {
          consultationId: consultation.id,
          action: 'completed',
          duration: finalDuration,
          timestamp,
          devoteeName: consultation.devotee.name,
          gurujiId: consultation.gurujiId
        });

        if (onUpdate) {
          onUpdate({
            ...consultation,
            endTime: timestamp,
            duration: finalDuration
          });
        }

        toast.success(`Consultation completed. Duration: ${finalDuration} minutes`);
      } else {
        toast.error(result.error || 'Failed to complete consultation');
      }
    } catch (error) {
      console.error('Error completing consultation:', error);
      toast.error('Failed to complete consultation');
    }
  };

  const elapsedSeconds = calculateElapsedTime();
  const isCompleted = !!consultation.endTime;

  return (
    <Card className={cn(
      "w-full max-w-md",
      isCompleted && "opacity-75",
      isPaused && "border-yellow-300 bg-yellow-50"
    )}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Clock className={cn(
            "h-5 w-5",
            isPaused ? "text-yellow-500" : "text-blue-500"
          )} />
          Consultation Timer
        </CardTitle>
        <div className="flex items-center gap-2">
          <User className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">
            {consultation.devotee.name || 'Unknown Devotee'}
          </span>
          <Badge variant={isCompleted ? "secondary" : isPaused ? "outline" : "default"}>
            {isCompleted ? 'COMPLETED' : isPaused ? 'PAUSED' : 'ACTIVE'}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Timer Display */}
        <div className="text-center">
          <div className={cn(
            "text-3xl font-mono font-bold",
            isPaused ? "text-yellow-600" : isCompleted ? "text-gray-600" : "text-blue-600"
          )}>
            {formatTime(elapsedSeconds)}
          </div>
          <div className="text-sm text-muted-foreground">
            Started: {formatAppointmentTime(startTime)}
            {isCompleted && endTime && (
              <>
                <br />
                Ended: {formatAppointmentTime(endTime)}
              </>
            )}
          </div>
        </div>

        {/* Timer Controls */}
        {!isCompleted && (
          <div className="flex gap-2 justify-center">
            <Button
              size="sm"
              variant={isPaused ? "default" : "secondary"}
              onClick={handlePauseResume}
              className="flex items-center gap-1"
            >
              {isPaused ? (
                <>
                  <Play className="h-3 w-3" />
                  Resume
                </>
              ) : (
                <>
                  <Pause className="h-3 w-3" />
                  Pause
                </>
              )}
            </Button>
            
            <SimpleCompleteButton
              onPrescribeAndComplete={onPrescribeAndComplete || handleCompleteConsultation}
              onSkipAndComplete={onSkipAndComplete || handleCompleteConsultation}
            />
          </div>
        )}

        {/* Statistics */}
        {(totalPausedTime > 0 || isCompleted) && (
          <div className="text-xs text-muted-foreground space-y-1 border-t pt-2">
            {totalPausedTime > 0 && (
              <div className="flex justify-between">
                <span>Total paused time:</span>
                <span>{formatTime(totalPausedTime)}</span>
              </div>
            )}
            {isCompleted && consultation.duration && (
              <div className="flex justify-between font-medium">
                <span>Final duration:</span>
                <span>{consultation.duration} minutes</span>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Hook for managing multiple consultation timers
export function useConsultationTimers() {
  const { socket } = useSocket();
  const [consultations, setConsultations] = useState<ConsultationSession[]>([]);

  useEffect(() => {
    const handleConsultationUpdate = (...args: unknown[]) => {
      const data = args[0] as {
        consultationId: string;
        updates?: Partial<ConsultationSession>;
      };
      setConsultations(prev => prev.map(consultation => 
        consultation.id === data.consultationId
          ? { ...consultation, ...data.updates }
          : consultation
      ));
    };

    socket.on(SocketEvents.CONSULTATION_UPDATE, handleConsultationUpdate);

    return () => {
      socket.off(SocketEvents.CONSULTATION_UPDATE, handleConsultationUpdate);
    };
  }, [socket]);

  const addConsultation = (consultation: ConsultationSession) => {
    setConsultations(prev => [...prev, consultation]);
  };

  const removeConsultation = (consultationId: string) => {
    setConsultations(prev => prev.filter(c => c.id !== consultationId));
  };

  const updateConsultation = (consultationId: string, updates: Partial<ConsultationSession>) => {
    setConsultations(prev => prev.map(c => 
      c.id === consultationId ? { ...c, ...updates } : c
    ));
  };

  return {
    consultations,
    addConsultation,
    removeConsultation,
    updateConsultation
  };
}