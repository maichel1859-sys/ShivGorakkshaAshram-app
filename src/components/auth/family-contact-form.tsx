"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Users, Heart, Check, AlertTriangle, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { registerFamilyContact } from "@/lib/actions/auth-actions";

const familyContactSchema = z.object({
  elderlyPhone: z
    .string()
    .min(10, "Phone number must be at least 10 digits")
    .max(15, "Phone number must be at most 15 digits")
    .regex(/^[+]?[1-9][\d\s\-\(\)]{8,15}$/, "Invalid phone number format"),
  elderlyName: z
    .string()
    .min(1, "Name is required")
    .max(100, "Name must be less than 100 characters"),
  familyContactPhone: z
    .string()
    .min(10, "Phone number must be at least 10 digits")
    .max(15, "Phone number must be at most 15 digits")
    .regex(/^[+]?[1-9][\d\s\-\(\)]{8,15}$/, "Invalid phone number format"),
  familyContactName: z
    .string()
    .min(1, "Name is required")
    .max(100, "Name must be less than 100 characters"),
  familyContactEmail: z
    .string()
    .email("Invalid email format")
    .optional()
    .or(z.literal("")),
  relationship: z
    .string()
    .min(1, "Relationship is required")
    .max(50, "Relationship must be less than 50 characters"),
  requestType: z.enum([
    "register",
    "book_appointment",
    "check_status",
    "get_remedy",
  ]),
  message: z
    .string()
    .max(500, "Message must be less than 500 characters")
    .optional(),
});

type FamilyContactData = z.infer<typeof familyContactSchema>;

interface FamilyContactFormProps {
  onSuccess?: () => void;
  className?: string;
}

export function FamilyContactForm({
  onSuccess,
  className = "",
}: FamilyContactFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const form = useForm<FamilyContactData>({
    resolver: zodResolver(familyContactSchema),
    defaultValues: {
      requestType: "register",
      familyContactEmail: "",
      message: "",
    },
  });

  const onSubmit = async (data: FamilyContactData) => {
    setIsLoading(true);

    try {
      // Convert form data to FormData for Server Action
      const formData = new FormData();
      Object.entries(data).forEach(([key, value]) => {
        if (value !== null && value !== undefined) {
          formData.append(key, String(value));
        }
      });

      const result = await registerFamilyContact(formData);

      if (result.success) {
        setIsSuccess(true);
        toast.success("Family contact registered successfully!");
        form.reset();
        onSuccess?.();
      } else {
        throw new Error(result.error || "Failed to register family contact");
      }
    } catch (error: unknown) {
      console.error("Family contact registration error:", error);
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Failed to register family contact";
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  if (isSuccess) {
    return (
      <Card className={className}>
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
              <Check className="h-8 w-8 text-green-600" />
            </div>
          </div>
          <CardTitle className="text-green-800">
            Registration Successful!
          </CardTitle>
          <CardDescription>
            Family contact has been registered successfully. You will receive
            confirmation messages shortly.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Alert>
              <Heart className="h-4 w-4" />
              <AlertDescription>
                <strong>What&apos;s next?</strong>
                <br />
                • Check your phone for SMS confirmation
                <br />
                • Check your email for detailed instructions
                <br />• Contact our coordinators for assistance with your first
                appointment
              </AlertDescription>
            </Alert>

            <Button
              onClick={() => setIsSuccess(false)}
              variant="outline"
              className="w-full"
            >
              Register Another Family Contact
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Users className="h-6 w-6 text-blue-600" />
          <span>Family Contact Registration</span>
        </CardTitle>
        <CardDescription>
          Help non-tech elderly users by registering as their family contact.
          You can book appointments and receive updates on their behalf.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Elderly User Information */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2 text-sm font-medium text-muted-foreground">
              <Heart className="h-4 w-4" />
              <span>Elderly User Information</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="elderlyName">
                  Elderly Person&apos;s Name *
                </Label>
                <Input
                  id="elderlyName"
                  placeholder="Full name"
                  {...form.register("elderlyName")}
                />
                {form.formState.errors.elderlyName && (
                  <p className="text-sm text-destructive">
                    {form.formState.errors.elderlyName.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="elderlyPhone">
                  Elderly Person&apos;s Phone *
                </Label>
                <Input
                  id="elderlyPhone"
                  placeholder="+91 98765 43210"
                  {...form.register("elderlyPhone")}
                />
                {form.formState.errors.elderlyPhone && (
                  <p className="text-sm text-destructive">
                    {form.formState.errors.elderlyPhone.message}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Family Contact Information */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2 text-sm font-medium text-muted-foreground">
              <Users className="h-4 w-4" />
              <span>Your Information (Family Contact)</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="familyContactName">Your Name *</Label>
                <Input
                  id="familyContactName"
                  placeholder="Your full name"
                  {...form.register("familyContactName")}
                />
                {form.formState.errors.familyContactName && (
                  <p className="text-sm text-destructive">
                    {form.formState.errors.familyContactName.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="familyContactPhone">Your Phone Number *</Label>
                <Input
                  id="familyContactPhone"
                  placeholder="+91 98765 43210"
                  {...form.register("familyContactPhone")}
                />
                {form.formState.errors.familyContactPhone && (
                  <p className="text-sm text-destructive">
                    {form.formState.errors.familyContactPhone.message}
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="familyContactEmail">Your Email (Optional)</Label>
              <Input
                id="familyContactEmail"
                type="email"
                placeholder="your.email@example.com"
                {...form.register("familyContactEmail")}
              />
              {form.formState.errors.familyContactEmail && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.familyContactEmail.message}
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                Email helps us send detailed updates and documents
              </p>
            </div>
          </div>

          {/* Relationship & Request Type */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="relationship">Relationship *</Label>
              <Select
                onValueChange={(value) => form.setValue("relationship", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select relationship" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="son">Son</SelectItem>
                  <SelectItem value="daughter">Daughter</SelectItem>
                  <SelectItem value="spouse">Spouse</SelectItem>
                  <SelectItem value="caregiver">Caregiver</SelectItem>
                  <SelectItem value="relative">Other Relative</SelectItem>
                  <SelectItem value="friend">Friend</SelectItem>
                </SelectContent>
              </Select>
              {form.formState.errors.relationship && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.relationship.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="requestType">Request Type *</Label>
              <Select
                onValueChange={(
                  value:
                    | "register"
                    | "book_appointment"
                    | "check_status"
                    | "get_remedy"
                ) => form.setValue("requestType", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="What do you need help with?" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="register">General Registration</SelectItem>
                  <SelectItem value="book_appointment">
                    Book Appointment
                  </SelectItem>
                  <SelectItem value="check_status">Check Status</SelectItem>
                  <SelectItem value="get_remedy">Access Remedies</SelectItem>
                </SelectContent>
              </Select>
              {form.formState.errors.requestType && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.requestType.message}
                </p>
              )}
            </div>
          </div>

          {/* Additional Message */}
          <div className="space-y-2">
            <Label htmlFor="message">Additional Message (Optional)</Label>
            <Textarea
              id="message"
              placeholder="Any specific needs or requests..."
              {...form.register("message")}
              rows={3}
            />
            {form.formState.errors.message && (
              <p className="text-sm text-destructive">
                {form.formState.errors.message.message}
              </p>
            )}
          </div>

          {/* Information Alert */}
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Important:</strong> By registering as a family contact,
              you acknowledge that:
              <ul className="mt-2 ml-4 list-disc text-sm">
                <li>
                  You have permission to act on behalf of the elderly person
                </li>
                <li>You will keep their information confidential</li>
                <li>You understand this is for spiritual guidance and care</li>
              </ul>
            </AlertDescription>
          </Alert>

          {/* Submit Button */}
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? (
              <>
                <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-b-transparent" />
                Registering...
              </>
            ) : (
              <>
                Register Family Contact
                <ArrowRight className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
