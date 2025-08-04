"use client";

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { usePWAState, useAppStore } from '@/store/app-store';
import { Download, X, Smartphone } from 'lucide-react';

export function PWAInstallPrompt() {
  const { canInstall, installPrompt, isInstalled } = usePWAState();
  const setPWAState = useAppStore(state => state.setPWAState);
  const [showPrompt, setShowPrompt] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Show prompt if can install and not already installed or dismissed
    if (canInstall && !isInstalled && !dismissed) {
      const timer = setTimeout(() => {
        setShowPrompt(true);
      }, 3000); // Show after 3 seconds

      return () => clearTimeout(timer);
    }
  }, [canInstall, isInstalled, dismissed]);

  const handleInstall = async () => {
    if (!installPrompt) return;

    try {
      const result = await (installPrompt as { prompt: () => Promise<{ outcome: string }> }).prompt();
      
      if (result.outcome === 'accepted') {
        setPWAState({
          isInstalled: true,
          canInstall: false,
          installPrompt: null,
        });
      }
    } catch (error) {
      console.error('Failed to install PWA:', error);
    }

    setShowPrompt(false);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    setDismissed(true);
    
    // Remember dismissal for this session
    sessionStorage.setItem('pwa-install-dismissed', 'true');
  };

  // Check if user dismissed this session
  useEffect(() => {
    const wasDismissed = sessionStorage.getItem('pwa-install-dismissed');
    if (wasDismissed) {
      setDismissed(true);
    }
  }, []);

  if (!showPrompt || isInstalled) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-sm">
      <Card className="shadow-lg border-primary/20">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center space-x-2 text-lg">
            <Smartphone className="h-5 w-5 text-primary" />
            <span>Install App</span>
          </CardTitle>
          <CardDescription>
            Install Ashram Management System for a better experience
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex items-center space-x-2">
            <Button onClick={handleInstall} size="sm" className="flex-1">
              <Download className="h-4 w-4 mr-2" />
              Install
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleDismiss}
              className="px-3"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          
          <div className="mt-3 text-xs text-muted-foreground">
            <ul className="space-y-1">
              <li>• Works offline</li>
              <li>• Faster loading</li>
              <li>• Push notifications</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}