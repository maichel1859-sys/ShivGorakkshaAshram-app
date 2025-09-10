"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Share, Plus, Home, X } from "lucide-react";

export function IOSPWAPrompt() {
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isInStandaloneMode, setIsInStandaloneMode] = useState(false);

  useEffect(() => {
    // Check if device is iOS
    const checkIsIOS = () => {
      return /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as unknown as { MSStream?: unknown }).MSStream;
    };

    // Check if already in standalone mode
    const checkIsInStandaloneMode = () => {
      return (window.navigator as unknown as { standalone?: boolean }).standalone === true ||
             window.matchMedia('(display-mode: standalone)').matches;
    };

    // Check if prompt was dismissed
    const wasDismissed = localStorage.getItem('ios-pwa-prompt-dismissed');
    const dismissedDate = wasDismissed ? new Date(wasDismissed) : null;
    const daysSinceDismissed = dismissedDate ? 
      (Date.now() - dismissedDate.getTime()) / (1000 * 60 * 60 * 24) : 0;

    const iosDevice = checkIsIOS();
    const standalone = checkIsInStandaloneMode();
    
    setIsIOS(iosDevice);
    setIsInStandaloneMode(standalone);

    // Show prompt if:
    // - Device is iOS
    // - Not in standalone mode
    // - Prompt hasn't been dismissed or was dismissed more than 7 days ago
    if (iosDevice && !standalone && (!wasDismissed || daysSinceDismissed > 7)) {
      const timer = setTimeout(() => {
        setShowPrompt(true);
      }, 5000); // Show after 5 seconds

      return () => clearTimeout(timer);
    }
  }, []);

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem('ios-pwa-prompt-dismissed', new Date().toISOString());
  };

  const handleInstallClick = () => {
    setShowPrompt(false);
    // The actual installation happens through the native iOS sharing menu
    // We'll scroll to show the share button
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (!showPrompt || !isIOS || isInStandaloneMode) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center sm:justify-center p-4">
      <Card className="w-full max-w-sm shadow-2xl animate-slide-up sm:animate-scale-up">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center space-x-2 text-lg">
              <Home className="h-5 w-5 text-primary" />
              <span>Add to Home Screen</span>
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDismiss}
              className="h-8 w-8 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <CardDescription>
            Install Ashram Management System for the best experience
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Step-by-step instructions */}
          <div className="space-y-3">
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0 w-6 h-6 bg-primary text-white rounded-full flex items-center justify-center text-xs font-bold">
                1
              </div>
              <div className="flex items-center space-x-2 text-sm">
                <span>Tap the</span>
                <Share className="h-4 w-4 text-blue-500" />
                <span className="font-medium">Share</span>
                <span>button</span>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0 w-6 h-6 bg-primary text-white rounded-full flex items-center justify-center text-xs font-bold">
                2
              </div>
              <div className="flex items-center space-x-2 text-sm">
                <span>Select</span>
                <Plus className="h-4 w-4 text-blue-500" />
                <span className="font-medium">Add to Home Screen</span>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0 w-6 h-6 bg-primary text-white rounded-full flex items-center justify-center text-xs font-bold">
                3
              </div>
              <div className="text-sm">
                <span>Tap</span>
                <span className="font-medium ml-1">Add</span>
              </div>
            </div>
          </div>

          {/* Benefits */}
          <div className="bg-muted rounded-lg p-3">
            <h4 className="text-sm font-medium mb-2">Benefits:</h4>
            <ul className="text-xs text-muted-foreground space-y-1">
              <li>• Works completely offline</li>
              <li>• Faster app-like experience</li>
              <li>• Full screen without browser bars</li>
              <li>• Push notifications (coming soon)</li>
            </ul>
          </div>

          <div className="flex space-x-2">
            <Button onClick={handleInstallClick} className="flex-1">
              <Home className="h-4 w-4 mr-2" />
              Got it!
            </Button>
            <Button variant="outline" onClick={handleDismiss}>
              Later
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// The required CSS animations have been added to globals.css