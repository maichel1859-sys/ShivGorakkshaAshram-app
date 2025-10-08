"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Eye, EyeOff, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { resetPassword, verifyResetToken } from "@/lib/actions/auth-actions";
import { toast } from "react-hot-toast";
import { useLanguage } from "@/contexts/LanguageContext";

const resetPasswordSchema = z
  .object({
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;

export default function ResetPasswordPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isVerifying, setIsVerifying] = useState(true);
  const [isValidToken, setIsValidToken] = useState(false);
  const [userEmail, setUserEmail] = useState<string>("");
  const [isSuccess, setIsSuccess] = useState(false);
  
  const searchParams = useSearchParams();
  const router = useRouter();
  const { t } = useLanguage();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
  });

  const token = searchParams.get('token');

  useEffect(() => {
    const verifyToken = async () => {
      if (!token) {
        toast.error('Invalid reset link');
        router.push('/forgot-password');
        return;
      }

      try {
        const result = await verifyResetToken(token);
        if (result.success) {
          setIsValidToken(true);
          setUserEmail(result.email || '');
        } else {
          toast.error(result.error || 'Invalid or expired reset token');
          router.push('/forgot-password');
        }
      } catch (error) {
        console.error('Token verification error:', error);
        toast.error('Failed to verify reset token');
        router.push('/forgot-password');
      } finally {
        setIsVerifying(false);
      }
    };

    verifyToken();
  }, [token, router]);

  const onSubmit = async (data: ResetPasswordFormData) => {
    if (!token) {
      toast.error('Invalid reset link');
      return;
    }

    setIsLoading(true);
    
    try {
      const formData = new FormData();
      formData.append('token', token);
      formData.append('password', data.password);
      formData.append('confirmPassword', data.confirmPassword);
      
      const result = await resetPassword(formData);
      
      if (result.success) {
        setIsSuccess(true);
        toast.success(result.message || 'Password reset successfully');
      } else {
        toast.error(result.error || 'Failed to reset password');
      }
    } catch (error) {
      console.error('Reset password error:', error);
      toast.error('An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (isVerifying) {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin" />
          <p className="mt-2 text-sm text-muted-foreground">
            {t('auth.verifyingToken', 'Verifying reset token...')}
          </p>
        </div>
      </div>
    );
  }

  if (!isValidToken) {
    return (
      <div className="space-y-6">
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">
            {t('auth.invalidToken', 'Invalid Reset Link')}
          </h1>
          <p className="text-sm text-muted-foreground">
            {t('auth.tokenExpired', 'This reset link is invalid or has expired.')}
          </p>
        </div>

        <div className="text-center">
          <Link
            href="/forgot-password"
            className="inline-flex items-center text-sm text-primary hover:underline"
          >
            <ArrowLeft className="mr-1 h-4 w-4" />
            {t('auth.requestNewReset', 'Request a new reset link')}
          </Link>
        </div>
      </div>
    );
  }

  if (isSuccess) {
    return (
      <div className="space-y-6">
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-semibold tracking-tight text-green-600">
            {t('auth.passwordResetSuccess', 'Password Reset Successful')}
          </h1>
          <p className="text-sm text-muted-foreground">
            {t('auth.canSignInNow', 'Your password has been reset successfully. You can now sign in with your new password.')}
          </p>
        </div>

        <div className="text-center">
          <Link
            href="/signin"
            className="inline-flex items-center text-sm text-primary hover:underline"
          >
            {t('auth.signInNow', 'Sign in now')}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">
          {t('auth.resetYourPassword', 'Reset your password')}
        </h1>
        <p className="text-sm text-muted-foreground">
          {t('auth.enterNewPassword', 'Enter your new password for')} {userEmail}
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-2">
          <label htmlFor="password" className="text-sm font-medium">
            {t('auth.newPassword', 'New Password')}
          </label>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              placeholder={t('auth.enterNewPassword', 'Enter your new password')}
              {...register("password")}
              disabled={isLoading}
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
            <p className="text-sm text-destructive">{errors.password.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <label htmlFor="confirmPassword" className="text-sm font-medium">
            {t('auth.confirmNewPassword', 'Confirm New Password')}
          </label>
          <div className="relative">
            <Input
              id="confirmPassword"
              type={showConfirmPassword ? "text" : "password"}
              placeholder={t('auth.confirmNewPassword', 'Confirm your new password')}
              {...register("confirmPassword")}
              disabled={isLoading}
            />
            <button
              type="button"
              className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
            >
              {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          {errors.confirmPassword && (
            <p className="text-sm text-destructive">
              {errors.confirmPassword.message}
            </p>
          )}
        </div>

        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {isLoading ? t('auth.resettingPassword', 'Resetting password...') : t('auth.resetPassword', 'Reset Password')}
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
