'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import Link from 'next/link';
import { useLanguage } from '@/contexts/LanguageContext';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const { t } = useLanguage();

  useEffect(() => {
    console.error('Application error:', error);
  }, [error]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-red-100 dark:from-red-950 dark:to-slate-900 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-red-100 dark:bg-red-900 rounded-full flex items-center justify-center mb-4">
            <AlertTriangle className="w-8 h-8 text-red-600 dark:text-red-400" />
          </div>
          <CardTitle className="text-2xl text-red-900 dark:text-red-100">
            {t('error.title', 'Something went wrong')}
          </CardTitle>
          <CardDescription className="text-red-600 dark:text-red-300">
            {t('error.description', 'An unexpected error occurred while loading the application.')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {process.env.NODE_ENV === 'development' && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
              <p className="text-sm font-mono text-red-800 dark:text-red-200 break-all">
                {error.message}
              </p>
              {error.digest && (
                <p className="text-xs text-red-600 dark:text-red-400 mt-2">
                  {t('error.errorId', 'Error ID')}: {error.digest}
                </p>
              )}
            </div>
          )}
          
          <div className="flex gap-3">
            <Button onClick={reset} className="flex-1" variant="default">
              <RefreshCw className="w-4 h-4 mr-2" />
              {t('error.tryAgain', 'Try again')}
            </Button>
            <Button asChild variant="outline" className="flex-1">
              <Link href="/">
                <Home className="w-4 h-4 mr-2" />
                {t('error.goHome', 'Go home')}
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}