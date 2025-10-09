'use client';

import { useRouter } from 'next/navigation';

// List of valid routes to prevent navigation to non-existent pages
const VALID_ROUTES = [
  '/',
  '/signin',
  '/signup',
  '/user',
  '/user/queue',
  '/user/appointments',
  '/user/appointments/book',
  '/user/remedies',
  '/user/remedies/[remedyId]',
  '/user/settings',
  '/user/checkin',
  '/user/qr-scanner',
  '/user/notifications',
  '/guruji',
  '/guruji/queue',
  '/guruji/appointments',
  '/guruji/consultations',
  '/guruji/remedies',
  '/guruji/remedies/[remedyId]',
  '/guruji/remedies/prescribe/[templateId]',
  '/guruji/settings',
  '/admin',
  '/admin/queue',
  '/admin/appointments',
  '/admin/appointments/[id]/edit',
  '/admin/users',
  '/admin/users/create',
  '/admin/remedies',
  '/admin/consultations',
  '/admin/notifications',
  '/admin/notifications/create',
  '/admin/reports',
  '/admin/reports/usage',
  '/admin/settings',
  '/admin/settings/general',
  '/admin/system',
  '/admin/qr-codes',
  '/coordinator',
  '/coordinator/appointments',
  '/coordinator/queue',
  '/coordinator/reception',
  '/coordinator/settings',
  '/unauthorized',
  '/error',
  '/forgot-password',
  '/reset-password',
  '/phone-login',
];

export function isValidRoute(path: string): boolean {
  return VALID_ROUTES.some(route => path.startsWith(route));
}

export function useSafeNavigation() {
  const router = useRouter();

  const safePush = (path: string) => {
    if (isValidRoute(path)) {
      router.push(path);
    } else {
      console.warn(`Attempted to navigate to invalid route: ${path}`);
      router.push('/'); // Fallback to home page
    }
  };

  const safeReplace = (path: string) => {
    if (isValidRoute(path)) {
      router.replace(path);
    } else {
      console.warn(`Attempted to replace with invalid route: ${path}`);
      router.replace('/'); // Fallback to home page
    }
  };

  return { safePush, safeReplace, isValidRoute };
}

// Hook for handling queue-related navigation
export function useQueueNavigation() {
  const { safePush } = useSafeNavigation();

  const navigateToQueue = (role: string) => {
    switch (role) {
      case 'USER':
        safePush('/user/queue');
        break;
      case 'GURUJI':
        safePush('/guruji/queue');
        break;
      case 'ADMIN':
        safePush('/admin/queue');
        break;
      default:
        safePush('/');
    }
  };

  const navigateToDashboard = (role: string) => {
    switch (role) {
      case 'USER':
        safePush('/user');
        break;
      case 'GURUJI':
        safePush('/guruji');
        break;
      case 'ADMIN':
        safePush('/admin');
        break;
      case 'COORDINATOR':
        safePush('/coordinator');
        break;
      default:
        safePush('/');
    }
  };

  return { navigateToQueue, navigateToDashboard };
}
