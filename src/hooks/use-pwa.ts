import { useEffect, useState } from 'react';

interface PWAState {
  isInstalled: boolean;
  canInstall: boolean;
  deferredPrompt: Event | null;
}

export function usePWA() {
  const [pwaState, setPWAState] = useState<PWAState>({
    isInstalled: false,
    canInstall: false,
    deferredPrompt: null,
  });

  useEffect(() => {
    // Check if app is already installed
    const checkIfInstalled = () => {
      if (typeof window !== 'undefined' && 'matchMedia' in window) {
        const mediaQuery = window.matchMedia('(display-mode: standalone)');
        setPWAState(prev => ({ ...prev, isInstalled: mediaQuery.matches }));
      }
    };

    // Handle beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setPWAState(prev => ({
        ...prev,
        canInstall: true,
        deferredPrompt: e,
      }));
    };

    // Handle appinstalled event
    const handleAppInstalled = () => {
      setPWAState(prev => ({
        ...prev,
        isInstalled: true,
        canInstall: false,
        deferredPrompt: null,
      }));
    };

    // Check initial installation status
    checkIfInstalled();

    // Add event listeners
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const installPWA = async () => {
    if (pwaState.deferredPrompt) {
      pwaState.deferredPrompt.prompt();
      const { outcome } = await pwaState.deferredPrompt.userChoice;
      
      if (outcome === 'accepted') {
        setPWAState(prev => ({
          ...prev,
          canInstall: false,
          deferredPrompt: null,
        }));
      }
    }
  };

  return {
    ...pwaState,
    installPWA,
  };
} 