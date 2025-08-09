"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Copy, ExternalLink, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { useApiDocs } from "@/hooks/queries/use-admin";

export default function APIDocsPage() {
  const { data: session, status } = useSession();
  const { data: spec, isLoading, error, refetch } = useApiDocs();

  // Redirect if not admin
  useEffect(() => {
    if (status === "loading") return;
    if (!session || session.user.role !== "ADMIN") {
      redirect("/signin");
    }
  }, [session, status]);

  const copyApiUrl = () => {
    const baseUrl = window.location.origin;
    navigator.clipboard.writeText(`${baseUrl}/api/docs`);
    toast.success("API documentation URL copied to clipboard");
  };

  const openSocketAdmin = () => {
    const baseUrl = window.location.origin;
    const socketAdminUrl = `${baseUrl}/admin/socket.io`;
    window.open(socketAdminUrl, "_blank");
  };

  if (status === "loading" || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-red-600">
              Error Loading API Documentation
            </CardTitle>
            <CardDescription>{error.message}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={() => refetch()}
              className="flex items-center gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">API Documentation</h1>
          <p className="text-muted-foreground mt-2">
            Complete API reference for Shivgoraksha Ashram Management System
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary">Admin Only</Badge>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">API Specification</CardTitle>
          </CardHeader>
          <CardContent>
            <Button
              onClick={copyApiUrl}
              variant="outline"
              className="w-full flex items-center gap-2"
            >
              <Copy className="h-4 w-4" />
              Copy Spec URL
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Socket.IO Admin</CardTitle>
          </CardHeader>
          <CardContent>
            <Button
              onClick={openSocketAdmin}
              variant="outline"
              className="w-full flex items-center gap-2"
            >
              <ExternalLink className="h-4 w-4" />
              Open Socket Admin
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">API Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="text-sm text-green-600">Operational</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* API Documentation */}
      <Card>
        <CardHeader>
          <CardTitle>Interactive API Documentation</CardTitle>
          <CardDescription>
            Explore and test all available API endpoints
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {spec && (
            <div className="swagger-ui-container">
              <div id="swagger-ui"></div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* API Information */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Authentication</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-sm text-muted-foreground">
              All API endpoints use NextAuth.js session-based authentication.
            </p>
            <div className="space-y-1">
              <p className="text-sm font-medium">Session Cookie:</p>
              <code className="text-xs bg-muted p-1 rounded">
                next-auth.session-token
              </code>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Base URL</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-sm text-muted-foreground">
              All API endpoints are relative to the base URL.
            </p>
            <div className="space-y-1">
              <p className="text-sm font-medium">Current Environment:</p>
              <code className="text-xs bg-muted p-1 rounded break-all">
                {typeof window !== "undefined"
                  ? window.location.origin
                  : "Loading..."}
              </code>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Swagger UI Script */}
      {spec && (
        <script
          dangerouslySetInnerHTML={{
            __html: `
              // Load Swagger UI CSS
              const link = document.createElement('link');
              link.rel = 'stylesheet';
              link.type = 'text/css';
              link.href = 'https://unpkg.com/swagger-ui-dist@5.9.0/swagger-ui.css';
              document.head.appendChild(link);

              // Load Swagger UI JS
              const script = document.createElement('script');
              script.src = 'https://unpkg.com/swagger-ui-dist@5.9.0/swagger-ui-bundle.js';
              script.onload = function() {
                window.ui = SwaggerUIBundle({
                  url: '${window.location.origin}/api/docs',
                  dom_id: '#swagger-ui',
                  deepLinking: true,
                  presets: [
                    SwaggerUIBundle.presets.apis,
                    SwaggerUIStandalonePreset
                  ],
                  plugins: [
                    SwaggerUIBundle.plugins.DownloadUrl
                  ],
                  layout: "StandaloneLayout",
                  requestInterceptor: function(request) {
                    request.credentials = 'include';
                    return request;
                  },
                  responseInterceptor: function(response) {
                    return response;
                  },
                  docExpansion: "list",
                  defaultModelsExpandDepth: 2,
                  defaultModelExpandDepth: 2,
                  filter: true,
                  tryItOutEnabled: true
                });
              };
              document.head.appendChild(script);

              // Load Swagger UI Standalone Preset
              const standaloneScript = document.createElement('script');
              standaloneScript.src = 'https://unpkg.com/swagger-ui-dist@5.9.0/swagger-ui-standalone-preset.js';
              document.head.appendChild(standaloneScript);
            `,
          }}
        />
      )}

      <style jsx global>{`
        .swagger-ui-container .swagger-ui {
          font-family: inherit;
        }
        .swagger-ui-container .swagger-ui .topbar {
          display: none;
        }
        .swagger-ui-container .swagger-ui .info {
          margin: 20px 0;
        }
        .swagger-ui-container .swagger-ui .scheme-container {
          background: transparent;
          box-shadow: none;
          padding: 0;
          margin: 0;
        }
      `}</style>
    </div>
  );
}
