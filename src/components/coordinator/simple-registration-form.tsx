"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  UserPlus,
  Phone,
  User,
  AlertTriangle,
  CheckCircle,
} from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

// Simple schema with minimal required fields
const simpleRegistrationSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  age: z
    .number()
    .min(1, "Age must be at least 1")
    .max(120, "Age must be less than 120"),
  gender: z.enum(["MALE", "FEMALE", "OTHER"]),
  phone: z.string().optional(),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  userCategory: z
    .enum(["WALK_IN", "EMERGENCY", "FAMILY_MEMBER"])
    .default("WALK_IN"),
});

type SimpleRegistration = z.infer<typeof simpleRegistrationSchema>;

interface SimpleRegistrationFormProps {
  onSuccess?: (userData: SimpleRegistration) => void;
  onCancel?: () => void;
  mode?: "registration" | "emergency" | "family";
}

export function SimpleRegistrationForm({
  onSuccess,
  onCancel,
  mode = "registration",
}: SimpleRegistrationFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
    reset,
  } = useForm<SimpleRegistration>({
    resolver: zodResolver(simpleRegistrationSchema),
    defaultValues: {
      userCategory:
        mode === "emergency"
          ? "EMERGENCY"
          : mode === "family"
          ? "FAMILY_MEMBER"
          : "WALK_IN",
    },
  });

  const handleFormSubmit = async (data: SimpleRegistration) => {
    setIsSubmitting(true);

    try {
      // Create FormData for server action
      const formData = new FormData();
      Object.entries(data).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== "") {
          formData.append(key, String(value));
        }
      });

      // For now, just simulate success - you can integrate with your actual server action
      await new Promise((resolve) => setTimeout(resolve, 1000));

      toast.success(
        `${
          mode === "emergency" ? "Emergency offline user" : "Offline user"
        } information collected successfully!`
      );

      if (onSuccess) {
        onSuccess(data);
      }

      reset();
    } catch (error) {
      console.error("Registration error:", error);
      toast.error("Failed to register devotee. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <UserPlus className="h-6 w-6 text-blue-500" />
            <div>
              <CardTitle className="text-2xl font-bold">
                {mode === "emergency"
                  ? "Emergency Offline User"
                  : mode === "family"
                  ? "Family Member (Offline)"
                  : "Offline User Information"}
              </CardTitle>
              <p className="text-sm text-gray-600 mt-1">
                {mode === "emergency"
                  ? "Priority registration for urgent cases"
                  : mode === "family"
                  ? "Register family member without mobile access"
                  : "Collect basic information for appointment booking"}
              </p>
            </div>
          </div>
          {mode === "emergency" && (
            <Badge variant="destructive" className="animate-pulse">
              <AlertTriangle className="h-4 w-4 mr-2" />
              Emergency
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="px-6 pb-6">
        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-8">
          {/* Basic Information */}
          <div className="space-y-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                <User className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                Basic Information
              </h3>
            </div>

            <div className="space-y-6">
              <div className="space-y-3">
                <Label
                  htmlFor="name"
                  className="text-sm font-medium text-gray-700 dark:text-gray-300"
                >
                  Full Name *
                </Label>
                <Input
                  id="name"
                  {...register("name")}
                  placeholder="Enter devotee's full name"
                  className={`h-12 text-base transition-all duration-200 ${
                    errors.name
                      ? "border-red-500 focus:border-red-500 focus:ring-red-500/20"
                      : "border-gray-300 dark:border-gray-600 focus:border-blue-500 focus:ring-blue-500/20"
                  }`}
                />
                {errors.name && (
                  <p className="text-sm text-red-500 flex items-center gap-1">
                    <AlertTriangle className="h-4 w-4" />
                    {errors.name.message}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <Label
                    htmlFor="age"
                    className="text-sm font-medium text-gray-700 dark:text-gray-300"
                  >
                    Age *
                  </Label>
                  <Input
                    id="age"
                    type="number"
                    {...register("age", { valueAsNumber: true })}
                    placeholder="Enter age"
                    min="1"
                    max="120"
                    className={`h-12 text-base transition-all duration-200 ${
                      errors.age
                        ? "border-red-500 focus:border-red-500 focus:ring-red-500/20"
                        : "border-gray-300 dark:border-gray-600 focus:border-blue-500 focus:ring-blue-500/20"
                    }`}
                  />
                  {errors.age && (
                    <p className="text-sm text-red-500 flex items-center gap-1">
                      <AlertTriangle className="h-4 w-4" />
                      {errors.age.message}
                    </p>
                  )}
                </div>

                <div className="space-y-3">
                  <Label
                    htmlFor="gender"
                    className="text-sm font-medium text-gray-700 dark:text-gray-300"
                  >
                    Gender *
                  </Label>
                  <Select
                    onValueChange={(value) =>
                      setValue("gender", value as "MALE" | "FEMALE" | "OTHER")
                    }
                  >
                    <SelectTrigger
                      className={`h-12 text-base transition-all duration-200 ${
                        errors.gender
                          ? "border-red-500 focus:border-red-500 focus:ring-red-500/20"
                          : "border-gray-300 dark:border-gray-600 focus:border-blue-500 focus:ring-blue-500/20"
                      }`}
                    >
                      <SelectValue placeholder="Select gender" />
                    </SelectTrigger>
                    <SelectContent className="rounded-lg shadow-lg border-0">
                      <SelectItem value="MALE" className="py-3">
                        Male
                      </SelectItem>
                      <SelectItem value="FEMALE" className="py-3">
                        Female
                      </SelectItem>
                      <SelectItem value="OTHER" className="py-3">
                        Other
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  {errors.gender && (
                    <p className="text-sm text-red-500 flex items-center gap-1">
                      <AlertTriangle className="h-4 w-4" />
                      {errors.gender.message}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Contact Information */}
          <div className="space-y-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
                <Phone className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                Contact Information
              </h3>
            </div>

            <div className="space-y-6">
              <div className="space-y-3">
                <Label
                  htmlFor="phone"
                  className="text-sm font-medium text-gray-700 dark:text-gray-300"
                >
                  Phone Number
                </Label>
                <Input
                  id="phone"
                  {...register("phone")}
                  placeholder="Phone number (optional for offline users)"
                  type="tel"
                  className="h-12 text-base transition-all duration-200 border-gray-300 dark:border-gray-600 focus:border-green-500 focus:ring-green-500/20"
                />
                {errors.phone && (
                  <p className="text-sm text-red-500 flex items-center gap-1">
                    <AlertTriangle className="h-4 w-4" />
                    {errors.phone.message}
                  </p>
                )}
              </div>

              <div className="space-y-3">
                <Label
                  htmlFor="email"
                  className="text-sm font-medium text-gray-700 dark:text-gray-300"
                >
                  Email Address
                </Label>
                <Input
                  id="email"
                  {...register("email")}
                  placeholder="Email address (optional)"
                  type="email"
                  className="h-12 text-base transition-all duration-200 border-gray-300 dark:border-gray-600 focus:border-green-500 focus:ring-green-500/20"
                />
                {errors.email && (
                  <p className="text-sm text-red-500 flex items-center gap-1">
                    <AlertTriangle className="h-4 w-4" />
                    {errors.email.message}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Registration Summary */}
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 p-6 rounded-xl border border-blue-200 dark:border-blue-800">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                <CheckCircle className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
                Registration Summary
              </h4>
            </div>
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Category:
                </span>
                <Badge
                  variant="outline"
                  className={`px-3 py-1 ${
                    mode === "emergency"
                      ? "border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400"
                      : mode === "family"
                      ? "border-purple-200 bg-purple-50 text-purple-700 dark:border-purple-800 dark:bg-purple-900/20 dark:text-purple-400"
                      : "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-900/20 dark:text-blue-400"
                  }`}
                >
                  {mode === "emergency"
                    ? "Emergency"
                    : mode === "family"
                    ? "Family Member"
                    : "Walk-in"}
                </Badge>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                This offline user will be added to the queue after appointment
                booking
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-6">
            <div>
              {onCancel && (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={onCancel}
                  className="px-6 py-3 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition-all duration-200"
                >
                  Cancel
                </Button>
              )}
            </div>

            <Button
              type="submit"
              disabled={isSubmitting}
              className="px-8 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-medium rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Collecting Info...
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4" />
                  Continue to Booking
                </div>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
