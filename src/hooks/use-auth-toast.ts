"use client";

import { signIn, signOut, getSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useAppStore, useAuthLoading } from '@/store/app-store';

interface AuthCredentials {
  email: string;
  password: string;
}

interface SignUpData {
  name: string;
  email: string;
  phone?: string;
  password: string;
}

export function useAuthToast() {
  const { setAuthLoading } = useAppStore();
  const isLoading = useAuthLoading();
  const router = useRouter();

  const signInWithToast = async (credentials: AuthCredentials) => {
    setAuthLoading(true);

    try {
      toast.loading('Signing you in...', { id: 'auth' });

      const result = await signIn('credentials', {
        email: credentials.email,
        password: credentials.password,
        redirect: false,
        callbackUrl: '/',
      });

      if (result?.error) {
        // Handle specific error cases
        let errorMessage = 'Invalid email or password. Please try again.';
        
        if (result.error === 'CredentialsSignin') {
          errorMessage = 'Invalid email or password. Please check your credentials.';
        } else if (result.error === 'AccessDenied') {
          errorMessage = 'Access denied. Your account may be disabled.';
        } else if (result.error === 'Verification') {
          errorMessage = 'Please verify your email address before signing in.';
        } else if (result.error.includes('rate limit')) {
          errorMessage = 'Too many sign-in attempts. Please try again later.';
        }
        
        toast.error(errorMessage, { id: 'auth' });
        return { success: false, error: result.error };
      }

      if (result?.ok) {
        toast.success('Welcome back! Signing you in...', { id: 'auth' });

        // Get updated session to check user role
        const session = await getSession();

        if (session?.user) {
          // Show role-specific welcome message
          const roleMessages = {
            ADMIN: 'Welcome, Administrator! Redirecting to admin dashboard...',
            COORDINATOR: 'Welcome, Coordinator! Redirecting to coordinator dashboard...',
            GURUJI: 'Welcome, Guruji! Redirecting to guruji dashboard...',
            USER: 'Welcome to ShivGorakksha Ashram! Redirecting to your dashboard...',
          };

          const welcomeMessage = roleMessages[session.user.role as keyof typeof roleMessages] || 'Welcome! Redirecting...';
          toast.success(welcomeMessage, { id: 'auth' });

          // Redirect based on user role
          switch (session.user.role) {
            case 'ADMIN':
              router.push('/admin');
              break;
            case 'COORDINATOR':
              router.push('/coordinator');
              break;
            case 'GURUJI':
              router.push('/guruji');
              break;
            default:
              router.push('/user');
          }
        } else {
          // Fallback redirect
          router.push('/');
        }

        return { success: true };
      }

      return { success: false, error: 'Sign in failed' };
    } catch (error) {
      console.error('Sign in error:', error);
      toast.error('An unexpected error occurred. Please try again.', { id: 'auth' });
      return { success: false, error: 'Sign in failed' };
    } finally {
      setAuthLoading(false);
    }
  };

  const signUpWithToast = async (data: SignUpData) => {
    setAuthLoading(true);

    try {
      toast.loading('Creating your account...', { id: 'auth' });

      // Convert form data to FormData for Server Action
      const formData = new FormData();
      formData.append('name', data.name);
      formData.append('email', data.email);
      formData.append('phone', data.phone || '');
      formData.append('password', data.password);

      // Import the registerUser function dynamically
      const { registerUser } = await import('@/lib/actions/auth-actions');
      const result = await registerUser(formData);

      if (result.success) {
        toast.success('Account created successfully! Please sign in to continue.', { id: 'auth' });
        router.push('/signin');
        return { success: true };
      } else {
        // Handle specific registration errors
        let errorMessage = result.error || 'Registration failed. Please try again.';
        
        if (result.error?.includes('email already exists')) {
          errorMessage = 'An account with this email already exists. Please sign in instead.';
        } else if (result.error?.includes('password')) {
          errorMessage = 'Password must be at least 8 characters long.';
        } else if (result.error?.includes('name')) {
          errorMessage = 'Please enter a valid name.';
        }
        
        toast.error(errorMessage, { id: 'auth' });
        return { success: false, error: result.error };
      }
    } catch (error) {
      console.error('Registration error:', error);
      toast.error('An unexpected error occurred. Please try again.', { id: 'auth' });
      return { success: false, error: 'Registration failed' };
    } finally {
      setAuthLoading(false);
    }
  };

  const signOutWithToast = async () => {
    setAuthLoading(true);

    try {
      toast.loading('Signing you out...', { id: 'auth' });

      await signOut({ 
        redirect: false,
        callbackUrl: '/signin'
      });

      toast.success('Signed out successfully. Thank you for using ShivGorakksha Ashram!', { id: 'auth' });
      router.push('/signin');
    } catch (error) {
      console.error('Sign out error:', error);
      toast.error('Error signing out. Please try again.', { id: 'auth' });
    } finally {
      setAuthLoading(false);
    }
  };

  const signInWithGoogle = async () => {
    setAuthLoading(true);

    try {
      toast.loading('Connecting to Google...', { id: 'auth' });

      await signIn('google', { 
        callbackUrl: '/',
        redirect: false 
      });

      toast.success('Google authentication successful!', { id: 'auth' });
    } catch (error) {
      console.error('Google sign in error:', error);
      toast.error('Google authentication failed. Please try again.', { id: 'auth' });
    } finally {
      setAuthLoading(false);
    }
  };

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast.error('Please enter a valid email address');
      return false;
    }
    return true;
  };

  const validatePassword = (password: string) => {
    if (password.length < 8) {
      toast.error('Password must be at least 8 characters long');
      return false;
    }
    return true;
  };

  const validateName = (name: string) => {
    if (name.length < 2) {
      toast.error('Name must be at least 2 characters long');
      return false;
    }
    return true;
  };

  const showSessionExpired = () => {
    toast.error('Your session has expired. Please sign in again.', {
      id: 'session-expired',
      duration: 5000,
    });
  };

  const showAccessDenied = () => {
    toast.error('Access denied. You do not have permission to access this resource.', {
      id: 'access-denied',
      duration: 5000,
    });
  };

  const showUnauthorized = () => {
    toast.error('Please sign in to access this feature.', {
      id: 'unauthorized',
      duration: 4000,
    });
  };

  return {
    isLoading,
    signInWithToast,
    signUpWithToast,
    signOutWithToast,
    signInWithGoogle,
    validateEmail,
    validatePassword,
    validateName,
    showSessionExpired,
    showAccessDenied,
    showUnauthorized,
  };
}
