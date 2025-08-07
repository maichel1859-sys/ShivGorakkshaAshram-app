import { create } from 'zustand';

// This store should only handle UI state related to authentication
// User data and session state should come from NextAuth/useSession
interface AuthUIState {
  // UI state only - never store actual user data or session
  showLoginModal: boolean;
  showSignupModal: boolean;
  isAuthenticating: boolean;
  authError: string | null;
  lastVisitedPage: string | null;
  
  // Actions
  setShowLoginModal: (show: boolean) => void;
  setShowSignupModal: (show: boolean) => void;
  setAuthenticating: (authenticating: boolean) => void;
  setAuthError: (error: string | null) => void;
  setLastVisitedPage: (page: string) => void;
  reset: () => void;
}

const initialState = {
  showLoginModal: false,
  showSignupModal: false,
  isAuthenticating: false,
  authError: null,
  lastVisitedPage: null,
};

export const useAuthUIStore = create<AuthUIState>((set) => ({
  ...initialState,

  setShowLoginModal: (show) => set({ showLoginModal: show }),
  setShowSignupModal: (show) => set({ showSignupModal: show }),
  setAuthenticating: (authenticating) => set({ isAuthenticating: authenticating }),
  setAuthError: (error) => set({ authError: error }),
  setLastVisitedPage: (page) => set({ lastVisitedPage: page }),
  reset: () => set(initialState),
}));

// Selector hooks for better performance
export const useShowLoginModal = () => useAuthUIStore((state) => state.showLoginModal);
export const useShowSignupModal = () => useAuthUIStore((state) => state.showSignupModal);
export const useIsAuthenticating = () => useAuthUIStore((state) => state.isAuthenticating);
export const useAuthError = () => useAuthUIStore((state) => state.authError);