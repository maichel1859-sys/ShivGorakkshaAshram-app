"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Eye, EyeOff } from "lucide-react";
import Link from "next/link";
import { useAuthToast } from "@/hooks/use-auth-toast";
import { FullScreenSpinner } from "@/components/loading";
import { useLanguage } from "@/contexts/LanguageContext";

const signupSchema = z
  .object({
    name: z.string().min(2, "Name must be at least 2 characters"),
    email: z.string().email("Please enter a valid email address"),
    phone: z.string().optional(),
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don&apos;t match",
    path: ["confirmPassword"],
  });

type SignupFormData = z.infer<typeof signupSchema>;

export default function SignUpPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const { isLoading, signUpWithToast, signInWithGoogle } = useAuthToast();
  const { t } = useLanguage();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignupFormData>({
    resolver: zodResolver(signupSchema),
  });

  const onSubmit = async (data: SignupFormData) => {
    await signUpWithToast({
      name: data.name,
      email: data.email,
      phone: data.phone,
      password: data.password,
      confirmPassword: data.confirmPassword,
    });
  };

  return (
    <div className="space-y-6">
      {isLoading && <FullScreenSpinner message={t('auth.creatingAccountMessage', 'Creating your account...')} />}
      <div className="space-y-2 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">
          {t('auth.createYourAccount', 'Create your account')}
        </h1>
        <p className="text-sm text-muted-foreground">
          {t('auth.joinAshramSystem', 'Join us to access the ashram management system')}
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-2">
          <label htmlFor="name" className="text-sm font-medium">
            {t('auth.fullName', 'Full Name')}
          </label>
          <Input
            id="name"
            type="text"
            placeholder={t('auth.enterFullName', 'Enter your full name')}
            {...register("name")}
            disabled={isLoading}
          />
          {errors.name && (
            <p className="text-sm text-destructive">{errors.name.message}</p>
          )}
        </div>

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

        <div className="space-y-2">
          <label htmlFor="phone" className="text-sm font-medium">
            {t('auth.phoneNumberOptional', 'Phone Number (Optional)')}
          </label>
          <Input
            id="phone"
            type="tel"
            placeholder={t('auth.enterPhoneNumber', 'Enter your phone number')}
            {...register("phone")}
            disabled={isLoading}
          />
          {errors.phone && (
            <p className="text-sm text-destructive">{errors.phone.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <label htmlFor="password" className="text-sm font-medium">
            {t('auth.password', 'Password')}
          </label>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              placeholder={t('auth.createPassword', 'Create a password')}
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
            <p className="text-sm text-destructive">
              {errors.password.message}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <label htmlFor="confirmPassword" className="text-sm font-medium">
            {t('auth.confirmPassword', 'Confirm Password')}
          </label>
          <div className="relative">
            <Input
              id="confirmPassword"
              type={showConfirmPassword ? "text" : "password"}
              placeholder={t('auth.confirmYourPassword', 'Confirm your password')}
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
          {isLoading ? t('auth.creatingAccount', 'Creating account...') : t('auth.createAccount', 'Create Account')}
        </Button>
      </form>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground">
            {t('auth.orContinueWith', 'Or continue with')}
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
        {t('auth.continueWithGoogle', 'Continue with Google')}
      </Button>

      <div className="text-center text-sm">
        <span className="text-muted-foreground">{t('auth.alreadyHaveAccount', 'Already have an account?')} </span>
        <Link
          href="/signin"
          className="font-medium text-primary hover:underline"
        >
          {t('auth.signIn', 'Sign in')}
        </Link>
      </div>
    </div>
  );
}
