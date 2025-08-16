"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Volume2, VolumeX, Play, Pause } from "lucide-react";
import { useSession } from "next-auth/react";
import { usePollingNotifications } from "@/hooks/use-polling-notifications";

interface AudioAnnouncementProps {
  className?: string;
}

interface AnnouncementMessage {
  id: string;
  message: string;
  type: "queue" | "general" | "urgent";
  priority: number;
  timestamp: Date;
}

export function AudioAnnouncement({ className = "" }: AudioAnnouncementProps) {
  const [isEnabled, setIsEnabled] = useState(true);
  const [volume, setVolume] = useState(0.8);
  const [currentMessage, setCurrentMessage] =
    useState<AnnouncementMessage | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const speechRef = useRef<SpeechSynthesisUtterance | null>(null);
  const queueRef = useRef<AnnouncementMessage[]>([]);

  const { data: session } = useSession();
  const { isPolling, currentInterval } = usePollingNotifications();

  useEffect(() => {
    // Initialize Web Audio API for sound effects
    audioRef.current = new Audio();
    audioRef.current.volume = volume;

    // Load notification sound (you can replace with actual audio file)
    audioRef.current.src = "/sounds/notification.mp3"; // Add this file to public/sounds/

    return () => {
      if (speechRef.current) {
        window.speechSynthesis.cancel();
      }
    };
  }, [volume]);

  const speakMessage = useCallback(
    (message: string): Promise<void> => {
      return new Promise((resolve) => {
        if (!("speechSynthesis" in window)) {
          console.warn("Speech synthesis not supported");
          resolve();
          return;
        }

        // Cancel any current speech
        window.speechSynthesis.cancel();

        const utterance = new SpeechSynthesisUtterance(message);
        speechRef.current = utterance;

        // Configure speech
        utterance.volume = volume;
        utterance.rate = 0.9; // Slightly slower for clarity
        utterance.pitch = 1.0;

        // Try to use a pleasant voice
        const voices = window.speechSynthesis.getVoices();
        const preferredVoice = voices.find(
          (voice) =>
            voice.lang.startsWith("en") &&
            (voice.name.includes("Google") || voice.name.includes("Microsoft"))
        );
        if (preferredVoice) {
          utterance.voice = preferredVoice;
        }

        utterance.onstart = () => {
          setIsPlaying(true);
        };

        utterance.onend = () => {
          setIsPlaying(false);
          resolve();
        };

        utterance.onerror = (event) => {
          setIsPlaying(false);
          console.error("Speech synthesis error:", event);
          resolve(); // Continue processing even if speech fails
        };

        window.speechSynthesis.speak(utterance);
      });
    },
    [volume]
  );

  const processQueue = useCallback(async () => {
    if (queueRef.current.length === 0 || isSpeaking || !isEnabled) return;

    const nextMessage = queueRef.current.shift();
    if (!nextMessage) return;

    setCurrentMessage(nextMessage);
    setIsSpeaking(true);

    try {
      await speakMessage(nextMessage.message);
    } catch (error) {
      console.error("Speech synthesis error:", error);
    } finally {
      setIsSpeaking(false);
      setCurrentMessage(null);

      // Process next message in queue after a brief delay
      setTimeout(() => {
        if (queueRef.current.length > 0) {
          processQueue();
        }
      }, 500);
    }
  }, [isSpeaking, isEnabled, speakMessage]);

  const addToQueue = useCallback(
    (announcement: AnnouncementMessage) => {
      queueRef.current.push(announcement);
      queueRef.current.sort((a, b) => b.priority - a.priority);

      // Process queue if not currently speaking
      if (!isSpeaking) {
        processQueue();
      }
    },
    [isSpeaking, processQueue]
  );

  // Note: Audio announcements are now handled by the polling system
  // The usePollingNotifications hook will trigger notifications that can be converted to audio
  useEffect(() => {
    if (!isEnabled) return;

    // This effect is now minimal since polling handles the updates
    // Audio announcements will be triggered by notification store updates
  }, [isEnabled]);

  const toggleEnabled = () => {
    setIsEnabled(!isEnabled);
    if (isEnabled && isSpeaking) {
      // Stop current speech
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      setIsPlaying(false);
      setCurrentMessage(null);
    }
  };

  const stopCurrentAnnouncement = () => {
    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      setIsPlaying(false);
      setCurrentMessage(null);
    }
  };

  const testAnnouncement = () => {
    const testMessage: AnnouncementMessage = {
      id: `test-${Date.now()}`,
      message:
        "This is a test announcement. The audio system is working properly. Om Shanti.",
      type: "general",
      priority: 1,
      timestamp: new Date(),
    };

    addToQueue(testMessage);
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {isEnabled ? (
              <Volume2 className="h-5 w-5 text-green-600" />
            ) : (
              <VolumeX className="h-5 w-5 text-red-500" />
            )}
            <span>Audio Announcements</span>
          </div>
          <div className="flex items-center space-x-2">
            {isSpeaking && (
              <div className="flex items-center space-x-1 text-green-600">
                <div className="w-2 h-2 bg-green-600 rounded-full animate-pulse"></div>
                <span className="text-sm">Speaking</span>
              </div>
            )}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Current Message */}
          {currentMessage && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="text-sm font-medium text-blue-900">
                    Current Announcement:
                  </p>
                  <p className="text-sm text-blue-800 mt-1">
                    {currentMessage.message}
                  </p>
                </div>
                {isPlaying && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={stopCurrentAnnouncement}
                  >
                    <Pause className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* Queue Status */}
          {queueRef.current.length > 0 && (
            <div className="text-sm text-muted-foreground">
              {queueRef.current.length} announcement
              {queueRef.current.length !== 1 ? "s" : ""} queued
            </div>
          )}

          {/* Volume Control */}
          <div className="space-y-2">
            <label htmlFor="volume-slider" className="text-sm font-medium">
              Volume
            </label>
            <input
              id="volume-slider"
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={volume}
              onChange={(e) => setVolume(parseFloat(e.target.value))}
              className="w-full"
              aria-label="Volume control"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Silent</span>
              <span>Loud</span>
            </div>
          </div>

          {/* Controls */}
          <div className="flex space-x-2">
            <Button
              variant={isEnabled ? "destructive" : "default"}
              onClick={toggleEnabled}
              className="flex-1"
            >
              {isEnabled ? (
                <>
                  <VolumeX className="mr-2 h-4 w-4" />
                  Disable Audio
                </>
              ) : (
                <>
                  <Volume2 className="mr-2 h-4 w-4" />
                  Enable Audio
                </>
              )}
            </Button>

            <Button
              variant="outline"
              onClick={testAnnouncement}
              disabled={!isEnabled}
            >
              <Play className="mr-2 h-4 w-4" />
              Test
            </Button>
          </div>

          {/* Instructions */}
          <div className="text-xs text-muted-foreground space-y-1">
            <p>• Announcements will play automatically for queue updates</p>
            <p>• High priority messages will include a notification sound</p>
            <p>
              • You may need to interact with the page first to enable audio
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
