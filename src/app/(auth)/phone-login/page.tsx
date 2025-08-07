"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import {
  Phone,
  Mail,
  ArrowRight,
  Shield,
  Clock,
  Check,
  Users,
  Loader2,
} from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import Link from "next/link";
import { sendPhoneOTP, verifyPhoneOTP } from "@/lib/actions/auth-actions";

const phoneLoginSchema = z.object({
  phone: z
    .string()
    .min(10, "Phone number must be at least 10 digits")
    .max(15, "Phone number must be at most 15 digits")
    .regex(/^[+]?[1-9][\d\s\-\(\)]{8,15}$/, "Invalid phone number format"),
});

const otpVerifySchema = z.object({
  otp: z
    .string()
    .length(6, "OTP must be 6 digits")
    .regex(/^\d{6}$/, "OTP must contain only numbers"),
});

type PhoneLoginData = z.infer<typeof phoneLoginSchema>;
type OTPVerifyData = z.infer<typeof otpVerifySchema>;

export default function PhoneLoginPage() {
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const [resendCountdown, setResendCountdown] = useState(0);
  const router = useRouter();

  const phoneForm = useForm<PhoneLoginData>({
    resolver: zodResolver(phoneLoginSchema),
  });

  const otpForm = useForm<OTPVerifyData>({
    resolver: zodResolver(otpVerifySchema),
  });

  const formatPhoneNumber = (phone: string) => {
    // Remove all non-digit characters
    const cleaned = phone.replace(/\D/g, "");

    // Add country code if not present
    if (cleaned.length === 10) {
      return `+91${cleaned}`;
    } else if (cleaned.length === 12 && cleaned.startsWith("91")) {
      return `+${cleaned}`;
    } else if (cleaned.length === 13 && cleaned.startsWith("+91")) {
      return cleaned;
    }

    return phone;
  };

  const onPhoneSubmit = async (data: PhoneLoginData) => {
    setIsLoading(true);

    try {
      const formattedPhone = formatPhoneNumber(data.phone);

      // Convert to FormData for Server Action
      const formData = new FormData();
      formData.append("phone", formattedPhone);

      const result = await sendPhoneOTP(formData);

      if (result.success) {
        setPhoneNumber(formattedPhone);
        setStep("otp");
        startResendCountdown();
        toast.success("OTP sent successfully to your phone");
      } else {
        throw new Error(result.error || "Failed to send OTP");
      }
    } catch (error: unknown) {
      console.error("Phone login error:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Failed to send OTP";
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const onOTPSubmit = async (data: OTPVerifyData) => {
    setIsLoading(true);

    try {
      // Convert to FormData for Server Action
      const formData = new FormData();
      formData.append("phone", phoneNumber);
      formData.append("otp", data.otp);

      const result = await verifyPhoneOTP(formData);

      if (result.success && result.user) {
        toast.success("Login successful!");

        // Redirect based on user role
        const redirectPath = getRedirectPath(result.user.role);
        router.push(redirectPath);
      } else {
        throw new Error(result.error || "Invalid OTP");
      }
    } catch (error: unknown) {
      console.error("OTP verification error:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Invalid OTP";
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const startResendCountdown = () => {
    setResendCountdown(60);
    const interval = setInterval(() => {
      setResendCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const resendOTP = async () => {
    if (resendCountdown > 0) return;

    setIsLoading(true);
    try {
      // Convert to FormData for Server Action
      const formData = new FormData();
      formData.append("phone", phoneNumber);

      const result = await sendPhoneOTP(formData);

      if (result.success) {
        startResendCountdown();
        toast.success("New OTP sent to your phone");
      } else {
        throw new Error(result.error || "Failed to resend OTP");
      }
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to resend OTP";
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const getRedirectPath = (role: string) => {
    switch (role) {
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

  const goBack = () => {
    setStep("phone");
    setPhoneNumber("");
    otpForm.reset();
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50 p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="flex justify-center">
            <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center">
              <Phone className="h-8 w-8 text-white" />
            </div>
          </div>
          <h1 className="text-2xl font-bold">Phone Login</h1>
          <p className="text-muted-foreground">
            {step === "phone"
              ? "Enter your phone number to receive an OTP"
              : "Enter the 6-digit code sent to your phone"}
          </p>
        </div>

        {/* Main Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              {step === "phone" ? (
                <>
                  <Phone className="h-5 w-5" />
                  <span>Phone Number</span>
                </>
              ) : (
                <>
                  <Shield className="h-5 w-5" />
                  <span>Verify OTP</span>
                </>
              )}
            </CardTitle>
            <CardDescription>
              {step === "phone"
                ? "We will send you a verification code"
                : `Code sent to ${phoneNumber}`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {step === "phone" ? (
              <form
                onSubmit={phoneForm.handleSubmit(onPhoneSubmit)}
                className="space-y-4"
              >
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    placeholder="+91 98765 43210"
                    {...phoneForm.register("phone")}
                    className="text-lg"
                  />
                  {phoneForm.formState.errors.phone && (
                    <p className="text-sm text-destructive">
                      {phoneForm.formState.errors.phone.message}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Enter your 10-digit mobile number with or without country
                    code
                  </p>
                </div>

                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Sending OTP...
                    </>
                  ) : (
                    <>
                      Send OTP
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>
              </form>
            ) : (
              <form
                onSubmit={otpForm.handleSubmit(onOTPSubmit)}
                className="space-y-4"
              >
                <div className="space-y-2">
                  <Label htmlFor="otp">Verification Code</Label>
                  <Input
                    id="otp"
                    placeholder="123456"
                    maxLength={6}
                    {...otpForm.register("otp")}
                    className="text-lg text-center tracking-widest"
                    autoComplete="one-time-code"
                  />
                  {otpForm.formState.errors.otp && (
                    <p className="text-sm text-destructive">
                      {otpForm.formState.errors.otp.message}
                    </p>
                  )}
                </div>

                {/* Resend OTP */}
                <div className="text-center">
                  {resendCountdown > 0 ? (
                    <div className="flex items-center justify-center space-x-2 text-sm text-muted-foreground">
                      <Clock className="h-4 w-4" />
                      <span>Resend OTP in {resendCountdown}s</span>
                    </div>
                  ) : (
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={resendOTP}
                      disabled={isLoading}
                      className="text-sm"
                    >
                      Didn&apos;t receive? Resend OTP
                    </Button>
                  )}
                </div>

                <div className="space-y-2">
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Verifying...
                      </>
                    ) : (
                      <>
                        <Check className="mr-2 h-4 w-4" />
                        Verify & Login
                      </>
                    )}
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    onClick={goBack}
                    className="w-full"
                    disabled={isLoading}
                  >
                    Change Phone Number
                  </Button>
                </div>
              </form>
            )}
          </CardContent>
        </Card>

        {/* Alternative Login Options */}
        {step === "phone" && (
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-4">
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <Separator />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">
                      Or continue with
                    </span>
                  </div>
                </div>

                <Link href="/signin">
                  <Button variant="outline" className="w-full">
                    <Mail className="mr-2 h-4 w-4" />
                    Email Login
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Family Contact Info */}
        <Alert>
          <Users className="h-4 w-4" />
          <AlertDescription>
            <strong>For non-tech users:</strong> Family members can help book
            appointments and manage your ashram visits. Contact our coordinators
            for assistance.
          </AlertDescription>
        </Alert>

        {/* Security Note */}
        <div className="text-center text-xs text-muted-foreground space-y-1">
          <p>🔒 Your phone number is securely encrypted</p>
          <p>We&apos;ll never share your personal information</p>
        </div>
      </div>
    </div>
  );
}
