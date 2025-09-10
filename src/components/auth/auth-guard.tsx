'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Role } from '@prisma/client';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

interface AuthGuardProps {
  children: React.ReactNode;
  requiredRoles?: Role[];
  redirectTo?: string;
  loadingComponent?: React.ReactNode;
}

export function AuthGuard({ 
  children, 
  requiredRoles = [], 
  redirectTo = '/signin',
  loadingComponent 
}: AuthGuardProps) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [isRedirecting, setIsRedirecting] = useState(false);

  useEffect(() => {
    if (status === 'loading') return;

    // Not authenticated
    if (status === 'unauthenticated' || !session?.user) {
      setIsRedirecting(true);
      router.push(redirectTo);
      return;
    }

    // Check role requirements
    if (requiredRoles.length > 0 && session.user.role) {
      const hasRequiredRole = requiredRoles.includes(session.user.role);
      
      if (!hasRequiredRole) {
        setIsRedirecting(true);
        router.push('/unauthorized');
        return;
      }
    }
  }, [status, session, requiredRoles, redirectTo, router]);

  // Show loading while checking authentication or redirecting
  if (status === 'loading' || isRedirecting) {
    return loadingComponent || <LoadingSpinner />;
  }

  // Not authenticated
  if (status === 'unauthenticated' || !session?.user) {
    return null; // Will redirect
  }

  // Check role requirements
  if (requiredRoles.length > 0 && session.user.role) {
    const hasRequiredRole = requiredRoles.includes(session.user.role);
    
    if (!hasRequiredRole) {
      return null; // Will redirect
    }
  }

  return <>{children}</>;
}

// Specific guards for different roles
export function AdminGuard({ children, ...props }: Omit<AuthGuardProps, 'requiredRoles'>) {
  return (
    <AuthGuard requiredRoles={['ADMIN']} {...props}>
      {children}
    </AuthGuard>
  );
}

export function GurujiGuard({ children, ...props }: Omit<AuthGuardProps, 'requiredRoles'>) {
  return (
    <AuthGuard requiredRoles={['ADMIN', 'GURUJI']} {...props}>
      {children}
    </AuthGuard>
  );
}

export function CoordinatorGuard({ children, ...props }: Omit<AuthGuardProps, 'requiredRoles'>) {
  return (
    <AuthGuard requiredRoles={['ADMIN', 'COORDINATOR']} {...props}>
      {children}
    </AuthGuard>
  );
}

export function UserGuard({ children, ...props }: Omit<AuthGuardProps, 'requiredRoles'>) {
  return (
    <AuthGuard requiredRoles={['ADMIN', 'USER']} {...props}>
      {children}
    </AuthGuard>
  );
}