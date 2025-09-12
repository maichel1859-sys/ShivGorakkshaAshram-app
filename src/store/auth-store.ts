import { create } from 'zustand';
import { useSession } from 'next-auth/react';
import { Role } from '@prisma/client';

// This store should only handle UI state related to authentication
// User data and session state should come from NextAuth/useSession
interface AuthUIState {
  // UI state only - never store actual user data or session
  showLoginModal: boolean;
  showSignupModal: boolean;
  authError: string | null;
  lastVisitedPage: string | null;
  
  // Actions
  setShowLoginModal: (show: boolean) => void;
  setShowSignupModal: (show: boolean) => void;
  setAuthError: (error: string | null) => void;
  setLastVisitedPage: (page: string) => void;
  reset: () => void;
}

const initialState = {
  showLoginModal: false,
  showSignupModal: false,
  authError: null,
  lastVisitedPage: null,
};

export const useAuthUIStore = create<AuthUIState>((set) => ({
  ...initialState,

  setShowLoginModal: (show) => set({ showLoginModal: show }),
  setShowSignupModal: (show) => set({ showSignupModal: show }),
  setAuthError: (error) => set({ authError: error }),
  setLastVisitedPage: (page) => set({ lastVisitedPage: page }),
  reset: () => set(initialState),
}));

// Main store export (for backward compatibility)
export const useAuthStore = useAuthUIStore;

// Selector hooks for better performance
export const useShowLoginModal = () => useAuthUIStore((state) => state.showLoginModal);
export const useShowSignupModal = () => useAuthUIStore((state) => state.showSignupModal);
export const useAuthError = () => useAuthUIStore((state) => state.authError);

// User role hooks with proper NextAuth session implementation
export const useUser = () => {
  const { data: session } = useSession();
  return session?.user || null;
};

export const useUserRole = () => {
  const { data: session } = useSession();
  return session?.user?.role || null;
};

export const useIsAuthenticated = () => {
  const { data: session, status } = useSession();
  return status === 'authenticated' && !!session?.user;
};

export const useIsAdmin = () => {
  const { data: session } = useSession();
  return session?.user?.role === 'ADMIN';
};

export const useIsGuruji = () => {
  const { data: session } = useSession();
  return session?.user?.role === 'GURUJI' || session?.user?.role === 'ADMIN';
};

export const useIsCoordinator = () => {
  const { data: session } = useSession();
  return session?.user?.role === 'COORDINATOR' || session?.user?.role === 'ADMIN';
};

export const useIsUser = () => {
  const { data: session } = useSession();
  return session?.user?.role === 'USER' || session?.user?.role === 'ADMIN';
};

// Additional security hooks
export const useSessionStatus = () => {
  const { status } = useSession();
  return status;
};

export const useHasRole = (roles: Role[]) => {
  const { data: session } = useSession();
  return session?.user?.role ? roles.includes(session.user.role) : false;
};

export const useHasAnyRole = (roles: Role[]) => {
  const userRole = useUserRole();
  return userRole ? roles.includes(userRole) : false;
};

// Redirect hooks for specific roles
export const useUserRedirect = () => {
  const { data: session, status } = useSession();
  
  console.log('🔐 useUserRedirect:', { status, userRole: session?.user?.role, hasSession: !!session });
  
  if (status === 'loading') return { isLoading: true, shouldRedirect: false };
  if (status === 'unauthenticated') {
    console.log('🚫 Unauthenticated - redirecting to signin');
    return { isLoading: false, shouldRedirect: true, redirectTo: '/signin' };
  }
  
  const userRole = session?.user?.role;
  if (!userRole) {
    console.log('🚫 No user role - redirecting to signin');
    return { isLoading: false, shouldRedirect: true, redirectTo: '/signin' };
  }
  
  // Allow USER and ADMIN roles for user pages
  if (userRole !== 'USER' && userRole !== 'ADMIN') {
    console.log('🚫 Insufficient role:', userRole, '- redirecting to unauthorized');
    return { isLoading: false, shouldRedirect: true, redirectTo: '/unauthorized' };
  }
  
  console.log('✅ Access granted for role:', userRole);
  return { isLoading: false, shouldRedirect: false };
};