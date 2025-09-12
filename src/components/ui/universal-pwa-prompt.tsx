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
import { Badge } from "@/components/ui/badge";
import { 
  Download, 
  X, 
  Smartphone, 
  Share, 
  Plus, 
  Home,
  Monitor,
  MoreHorizontal,
  CheckCircle
} from "lucide-react";
import { detectPlatform, getInstallPromptText, type PlatformInfo } from "@/lib/platform-detection";
import { usePWA } from "@/hooks/use-pwa";
import { cn } from "@/lib/utils/helpers";

export function UniversalPWAPrompt() {
  const [platformInfo, setPlatformInfo] = useState<PlatformInfo | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const { isInstalled, canInstall, installPWA } = usePWA();

  useEffect(() => {
    const info = detectPlatform();
    setPlatformInfo(info);

    // Check if user dismissed this session
    const wasDismissed = sessionStorage.getItem("universal-pwa-prompt-dismissed");
    if (wasDismissed) {
      setDismissed(true);
      return;
    }

    // Show prompt if can install and not already installed or dismissed
    if (info.canInstall && !info.isStandalone && !dismissed) {
      const timer = setTimeout(() => {
        setShowPrompt(true);
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [canInstall, isInstalled, dismissed]);

  const handleInstall = async () => {
    if (!platformInfo) return;

    if (platformInfo.installation.method === 'native') {
      // Try native install prompt
      try {
        await installPWA();
        setShowPrompt(false);
      } catch (error) {
        console.error('Failed to install PWA:', error);
        // Fallback to manual instructions
        setCurrentStep(1);
      }
    } else {
      // Show manual instructions
      setCurrentStep(1);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    setDismissed(true);
    sessionStorage.setItem("universal-pwa-prompt-dismissed", "true");
  };

  const handleComplete = () => {
    setShowPrompt(false);
    setCurrentStep(0);
  };

  if (!showPrompt || !platformInfo || platformInfo.isStandalone) {
    return null;
  }

  const getPlatformIcon = () => {
    switch (platformInfo.platform) {
      case 'ios':
        return <Smartphone className="h-5 w-5" />;
      case 'android':
        return <Smartphone className="h-5 w-5" />;
      case 'desktop':
        return <Monitor className="h-5 w-5" />;
      default:
        return <Download className="h-5 w-5" />;
    }
  };

  const getPlatformTitle = () => {
    switch (platformInfo.platform) {
      case 'ios':
        return 'Add to Home Screen';
      case 'android':
        return 'Install App';
      case 'desktop':
        return 'Install Desktop App';
      default:
        return 'Install App';
    }
  };

  const getBenefits = () => {
    const baseBenefits = ['Faster loading', 'Works offline'];
    
    if (platformInfo.supports.pushNotifications) {
      baseBenefits.push('Push notifications');
    }
    
    if (platformInfo.platform === 'desktop') {
      baseBenefits.push('Desktop shortcut');
    } else {
      baseBenefits.push('Home screen icon');
    }

    return baseBenefits;
  };

  const renderInstallationSteps = () => {
    const instructions = platformInfo.installation.instructions;
    
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Installation Steps</h3>
          <Button variant="ghost" size="sm" onClick={handleComplete}>
            <CheckCircle className="h-4 w-4 mr-2" />
            Got it!
          </Button>
        </div>

        <div className="space-y-3">
          {instructions.map((instruction, index) => (
            <div key={index} className="flex items-start space-x-3">
              <div className="flex-shrink-0 w-6 h-6 bg-primary text-white rounded-full flex items-center justify-center text-xs font-bold">
                {index + 1}
              </div>
              <div className="flex items-center space-x-2 text-sm">
                {instruction.includes('Share button') && (
                  <Share className="h-4 w-4 text-blue-500" />
                )}
                {instruction.includes('Add to Home Screen') && (
                  <Plus className="h-4 w-4 text-blue-500" />
                )}
                {instruction.includes('menu') && (
                  <MoreHorizontal className="h-4 w-4 text-blue-500" />
                )}
                <span>{instruction}</span>
              </div>
            </div>
          ))}
        </div>

        {platformInfo.platform === 'ios' && platformInfo.browser !== 'safari' && (
          <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-sm text-yellow-800">
              <strong>Tip:</strong> For the best PWA experience on iOS, use Safari browser.
            </p>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={cn(
      "fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center sm:justify-center p-4",
      platformInfo.platform === 'ios' ? "items-end" : "sm:items-center"
    )}>
      <Card className={cn(
        "w-full max-w-sm shadow-2xl",
        "animate-slide-up sm:animate-scale-up",
        currentStep === 1 ? "max-w-md" : ""
      )}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center space-x-2 text-lg">
              {getPlatformIcon()}
              <span>{getPlatformTitle()}</span>
            </CardTitle>
            <div className="flex items-center space-x-2">
              <Badge variant="outline" className="text-xs">
                {platformInfo.platform.toUpperCase()}
              </Badge>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDismiss}
                className="h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <CardDescription>
            {getInstallPromptText(platformInfo)}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {currentStep === 0 ? (
            // Initial prompt screen
            <>
              {/* Installation method indicator */}
              <div className="flex items-center space-x-2">
                <div className={cn(
                  "w-2 h-2 rounded-full",
                  platformInfo.installation.method === 'native' ? "bg-green-500" : 
                  platformInfo.installation.method === 'manual' ? "bg-blue-500" : "bg-gray-400"
                )} />
                <span className="text-xs text-muted-foreground">
                  {platformInfo.installation.method === 'native' ? 'Auto Installation' :
                   platformInfo.installation.method === 'manual' ? 'Manual Installation' : 'Limited Support'}
                </span>
              </div>

              {/* Benefits */}
              <div className="bg-muted rounded-lg p-3">
                <h4 className="text-sm font-medium mb-2">Benefits:</h4>
                <ul className="text-xs text-muted-foreground space-y-1">
                  {getBenefits().map((benefit, index) => (
                    <li key={index}>• {benefit}</li>
                  ))}
                </ul>
              </div>

              {/* Action buttons */}
              <div className="flex space-x-2">
                <Button 
                  onClick={handleInstall} 
                  className="flex-1"
                  disabled={platformInfo.installation.method === 'unsupported'}
                >
                  {platformInfo.installation.method === 'native' ? (
                    <>
                      <Download className="h-4 w-4 mr-2" />
                      Install Now
                    </>
                  ) : (
                    <>
                      <Home className="h-4 w-4 mr-2" />
                      Show Steps
                    </>
                  )}
                </Button>
                <Button variant="outline" onClick={handleDismiss}>
                  Later
                </Button>
              </div>

              {/* Browser compatibility note */}
              {platformInfo.installation.method === 'unsupported' && (
                <div className="text-center p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-600">
                    For better app experience, try using {platformInfo.platform === 'ios' ? 'Safari' : 'Chrome'}
                  </p>
                </div>
              )}
            </>
          ) : (
            // Installation steps screen
            renderInstallationSteps()
          )}
        </CardContent>
      </Card>
    </div>
  );
}