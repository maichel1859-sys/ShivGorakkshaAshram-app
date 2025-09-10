"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ShieldX, ArrowLeft, Home } from "lucide-react";
import Link from "next/link";
import { useSession } from "next-auth/react";

export default function UnauthorizedPage() {
  const { data: session } = useSession();

  const getRedirectPath = () => {
    if (!session?.user) {
      return "/signin";
    }
    
    switch (session.user.role) {
      case "ADMIN":
        return "/admin";
      case "COORDINATOR":
        return "/coordinator";
      case "GURUJI":
        return "/guruji";
      default:
        return "/user";
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
            <ShieldX className="h-6 w-6 text-red-600" />
          </div>
          <CardTitle className="text-2xl font-bold text-gray-900">
            Access Denied
          </CardTitle>
          <CardDescription className="text-gray-600">
            You don&apos;t have permission to access this page.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center text-sm text-gray-500">
            {session?.user ? (
              <>
                <p>Your role: <span className="font-medium">{session.user.role}</span></p>
                <p>This page requires different permissions.</p>
              </>
            ) : (
              <p>Please sign in to access this page.</p>
            )}
          </div>
          <div className="flex flex-col space-y-2">
            <Button asChild className="w-full">
              <Link href={getRedirectPath()}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Go to Your Dashboard
              </Link>
            </Button>
            <Button variant="outline" asChild className="w-full">
              <Link href="/">
                <Home className="mr-2 h-4 w-4" />
                Go to Home
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
