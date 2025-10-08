"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import Link from "next/link";
import { useAuthToast } from "@/hooks/use-auth-toast";
import { FullScreenSpinner } from "@/components/loading";
import { useLanguage } from "@/contexts/LanguageContext";

const signinSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

type SigninFormData = z.infer<typeof signinSchema>;

export default function SignInPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const { isLoading, signInWithToast, signInWithGoogle } = useAuthToast();
  const { t } = useLanguage();

  // Clear any URL parameters on component mount to prevent credential exposure
  useEffect(() => {
    if (typeof window !== "undefined" && window.location.search) {
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SigninFormData>({
    resolver: zodResolver(signinSchema),
  });

  const onSubmit = async (data: SigninFormData) => {
    // Prevent any potential GET submission
    if (typeof window !== "undefined") {
      // Clear any URL parameters that might contain credentials
      if (window.location.search) {
        window.history.replaceState(
          {},
          document.title,
          window.location.pathname
        );
      }
    }

    const result = await signInWithToast({
      email: data.email,
      password: data.password,
    });

    // Set redirecting state if login was successful
    if (result?.success) {
      setIsRedirecting(true);
    }
  };

  // Show full screen loading during authentication or redirect
  if (isLoading || isRedirecting) {
    return (
      <FullScreenSpinner
        message={
          isRedirecting
            ? t("auth.redirecting", "Redirecting to dashboard...")
            : t("auth.signingIn", "Signing you in...")
        }
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">
          {t("auth.signInToAccount", "Sign in to your account")}
        </h1>
        <p className="text-sm text-muted-foreground">
          {t(
            "auth.enterCredentials",
            "Enter your credentials to access the system"
          )}
        </p>
      </div>

      <form
        onSubmit={handleSubmit(onSubmit)}
        method="POST"
        className="space-y-4"
      >
        <div className="space-y-2">
          <label htmlFor="email" className="text-sm font-medium">
            {t("auth.email", "Email")}
          </label>
          <Input
            id="email"
            type="email"
            placeholder={t("auth.enterEmail", "Enter your email")}
            {...register("email")}
            disabled={isLoading || isRedirecting}
          />
          {errors.email && (
            <p className="text-sm text-destructive">{errors.email.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <label htmlFor="password" className="text-sm font-medium">
            {t("auth.password", "Password")}
          </label>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              placeholder={t("auth.enterPassword", "Enter your password")}
              {...register("password")}
              disabled={isLoading || isRedirecting}
            />
            <button
              type="button"
              className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          {errors.password && (
            <p className="text-sm text-destructive">
              {errors.password.message}
            </p>
          )}
        </div>

        <Button
          type="submit"
          className="w-full"
          disabled={isLoading || isRedirecting}
        >
          {(isLoading || isRedirecting) && (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          )}
          {isRedirecting
            ? t("auth.redirecting", "Redirecting...")
            : isLoading
            ? t("auth.signingIn", "Signing in...")
            : t("auth.signIn", "Sign In")}
        </Button>
      </form>

      <div className="text-center">
        <Link
          href="/forgot-password"
          className="text-sm text-primary hover:underline"
        >
          {t("auth.forgotPassword", "Forgot your password?")}
        </Link>
      </div>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground">
            {t("auth.orContinueWith", "Or continue with")}
          </span>
        </div>
      </div>

      <Button
        variant="outline"
        type="button"
        className="w-full"
        onClick={signInWithGoogle}
        disabled={isLoading}
      >
        <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
          <path
            fill="currentColor"
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
          />
          <path
            fill="currentColor"
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
          />
          <path
            fill="currentColor"
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
          />
          <path
            fill="currentColor"
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
          />
        </svg>
        {t("auth.continueWithGoogle", "Continue with Google")}
      </Button>

      <div className="text-center text-sm">
        <span className="text-muted-foreground">
          {t("auth.dontHaveAccount", "Don't have an account?")}{" "}
        </span>
        <Link
          href="/signup"
          className="font-medium text-primary hover:underline"
        >
          {t("auth.signUp", "Sign up")}
        </Link>
      </div>
    </div>
  );
}
