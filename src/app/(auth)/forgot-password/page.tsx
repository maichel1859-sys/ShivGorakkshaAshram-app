"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { requestPasswordReset } from "@/lib/actions/auth-actions";
import { toast } from "react-hot-toast";
import { useLanguage } from "@/contexts/LanguageContext";

const forgotPasswordSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
});

type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;

export default function ForgotPasswordPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [resetInfo, setResetInfo] = useState<{ resetToken?: string; resetUrl?: string } | null>(null);
  const { t } = useLanguage();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
  });

  const onSubmit = async (data: ForgotPasswordFormData) => {
    setIsLoading(true);
    
    try {
      const formData = new FormData();
      formData.append('email', data.email);
      
      const result = await requestPasswordReset(formData);
      
      if (result.success) {
        setIsSubmitted(true);
        setResetInfo({
          resetToken: result.resetToken,
          resetUrl: result.resetUrl
        });
        toast.success(result.message);
      } else {
        toast.error(result.error || 'Failed to send reset link');
      }
    } catch (error) {
      console.error('Forgot password error:', error);
      toast.error('An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (isSubmitted) {
    return (
      <div className="space-y-6">
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">
            {t('auth.checkYourEmail', 'Check your email')}
          </h1>
          <p className="text-sm text-muted-foreground">
            {t('auth.resetLinkSent', 'We have sent a password reset link to your email address.')}
          </p>
        </div>

        {/* Development/Testing Info - Remove in production */}
        {resetInfo?.resetToken && (
          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <h3 className="font-medium text-yellow-800 mb-2">Development Mode</h3>
            <p className="text-sm text-yellow-700 mb-2">
              Since email is disabled, here's your reset link:
            </p>
            <div className="space-y-2">
              <p className="text-xs font-mono bg-yellow-100 p-2 rounded break-all">
                Token: {resetInfo.resetToken}
              </p>
              <Link
                href={resetInfo.resetUrl || '#'}
                className="inline-block text-sm text-blue-600 hover:underline"
              >
                Click here to reset password
              </Link>
            </div>
          </div>
        )}

        <div className="text-center">
          <Link
            href="/signin"
            className="inline-flex items-center text-sm text-primary hover:underline"
          >
            <ArrowLeft className="mr-1 h-4 w-4" />
            {t('auth.backToSignIn', 'Back to sign in')}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">
          {t('auth.forgotPassword', 'Forgot your password?')}
        </h1>
        <p className="text-sm text-muted-foreground">
          {t('auth.enterEmailToReset', 'Enter your email address and we will send you a link to reset your password.')}
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-2">
          <label htmlFor="email" className="text-sm font-medium">
            {t('auth.email', 'Email')}
          </label>
          <Input
            id="email"
            type="email"
            placeholder={t('auth.enterEmail', 'Enter your email')}
            {...register("email")}
            disabled={isLoading}
          />
          {errors.email && (
            <p className="text-sm text-destructive">{errors.email.message}</p>
          )}
        </div>

        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {isLoading ? t('auth.sendingResetLink', 'Sending reset link...') : t('auth.sendResetLink', 'Send reset link')}
        </Button>
      </form>

      <div className="text-center">
        <Link
          href="/signin"
          className="inline-flex items-center text-sm text-primary hover:underline"
        >
          <ArrowLeft className="mr-1 h-4 w-4" />
          {t('auth.backToSignIn', 'Back to sign in')}
        </Link>
      </div>
    </div>
  );
}
