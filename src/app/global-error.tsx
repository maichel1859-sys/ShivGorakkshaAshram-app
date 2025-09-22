'use client';

import { useEffect } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to the console and external services
    console.error('Global error:', error);

    // In production, send to error tracking service
    if (process.env.NODE_ENV === 'production') {
      // TODO: Send to error tracking service (Sentry, Bugsnag, etc.)
      console.error('Production global error:', {
        message: error.message,
        stack: error.stack,
        digest: error.digest,
        timestamp: new Date().toISOString(),
        userAgent: window.navigator.userAgent,
        url: window.location.href,
      });
    }
  }, [error]);

  const handleGoHome = () => {
    window.location.href = '/';
  };

  const handleReload = () => {
    window.location.reload();
  };

  return (
    <html>
      <body>
        <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
          <Card className="w-full max-w-lg">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-red-100 flex items-center justify-center">
                <AlertTriangle className="h-8 w-8 text-red-600" />
              </div>
              <CardTitle className="text-2xl">Application Error</CardTitle>
              <CardDescription className="text-base">
                ShivGorakkshaAshram App encountered an unexpected error.
                We apologize for the inconvenience.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {process.env.NODE_ENV === 'development' && (
                <div className="rounded-md bg-gray-100 p-4">
                  <details className="text-sm">
                    <summary className="cursor-pointer font-medium text-gray-900 mb-2">
                      Error Details (Development Mode)
                    </summary>
                    <div className="text-xs text-gray-600 space-y-2">
                      <p><strong>Message:</strong> {error.message}</p>
                      {error.digest && <p><strong>Digest:</strong> {error.digest}</p>}
                      {error.stack && (
                        <div>
                          <strong>Stack Trace:</strong>
                          <pre className="mt-1 whitespace-pre-wrap text-xs bg-gray-50 p-2 rounded">
                            {error.stack}
                          </pre>
                        </div>
                      )}
                    </div>
                  </details>
                </div>
              )}

              <div className="space-y-3">
                <p className="text-sm text-gray-600 text-center">
                  This error has been logged and our team will investigate.
                </p>

                <div className="flex flex-col gap-2">
                  <Button
                    onClick={reset}
                    className="w-full"
                    size="lg"
                  >
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Try Again
                  </Button>

                  <Button
                    onClick={handleReload}
                    className="w-full"
                    variant="outline"
                    size="lg"
                  >
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Reload Application
                  </Button>

                  <Button
                    onClick={handleGoHome}
                    className="w-full"
                    variant="ghost"
                    size="lg"
                  >
                    <Home className="mr-2 h-4 w-4" />
                    Return to Home
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </body>
    </html>
  );
}