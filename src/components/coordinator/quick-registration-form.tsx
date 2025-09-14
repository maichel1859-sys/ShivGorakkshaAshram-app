"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  UserPlus,
  Phone,
  User,
  AlertTriangle,
  CheckCircle,
  FileText,
  Clock,
} from "lucide-react";
import { toast } from "sonner";
import { quickRegistrationSchema, type QuickRegistration } from "@/lib/validation/unified-schemas";
import { createQuickRegistration } from "@/lib/actions/reception-actions";

interface QuickRegistrationFormProps {
  onSuccess?: (userData: QuickRegistration) => void;
  onCancel?: () => void;
  defaultValues?: Partial<QuickRegistration>;
  mode?: "registration" | "emergency" | "family";
}

export function QuickRegistrationForm({ 
  onSuccess, 
  onCancel, 
  defaultValues,
  mode = "registration" 
}: QuickRegistrationFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
    reset,
  } = useForm<QuickRegistration>({
    resolver: zodResolver(quickRegistrationSchema),
    defaultValues: {
      userCategory: mode === "emergency" ? "EMERGENCY" : mode === "family" ? "FAMILY_MEMBER" : "WALK_IN",
      registrationMethod: "COORDINATOR_ASSISTED",
      techAccessibility: "NO_ACCESS",
      ...defaultValues,
    },
  });

  const watchedFields = watch();

  const handleFormSubmit = async (data: QuickRegistration) => {
    setIsSubmitting(true);
    
    try {
      // Create FormData for server action
      const formData = new FormData();
      Object.entries(data).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== "") {
          formData.append(key, String(value));
        }
      });

      // Call server action to create user
      const result = await createQuickRegistration(formData);
      
      if (!result.success) {
        toast.error(result.error || "Failed to register devotee");
        return;
      }
      
      toast.success(`${mode === "emergency" ? "Emergency devotee" : "New devotee"} registered successfully!`);
      
      if (onSuccess) {
        onSuccess(data);
      }
      
      reset();
      setCurrentStep(1);
    } catch (error) {
      console.error("Registration error:", error);
      toast.error("Failed to register devotee. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const nextStep = () => {
    if (currentStep < 3) setCurrentStep(currentStep + 1);
  };

  const prevStep = () => {
    if (currentStep > 1) setCurrentStep(currentStep - 1);
  };

  const getStepIcon = (step: number) => {
    if (step < currentStep) return <CheckCircle className="h-5 w-5 text-green-500" />;
    if (step === currentStep) return <Clock className="h-5 w-5 text-blue-500" />;
    return <div className="h-5 w-5 rounded-full border-2 border-gray-300" />;
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <UserPlus className="h-6 w-6 text-blue-600" />
            <CardTitle className="text-xl">
              {mode === "emergency" ? "Emergency Registration" : 
               mode === "family" ? "Family Member Registration" : 
               "Quick Devotee Registration"}
            </CardTitle>
          </div>
          {mode === "emergency" && (
            <Badge variant="destructive" className="animate-pulse">
              <AlertTriangle className="h-3 w-3 mr-1" />
              Emergency
            </Badge>
          )}
        </div>

        {/* Progress Steps */}
        <div className="flex items-center justify-between mt-4">
          <div className="flex items-center space-x-2">
            {getStepIcon(1)}
            <span className={`text-sm ${currentStep >= 1 ? 'text-blue-600 font-medium' : 'text-gray-500'}`}>
              Basic Info
            </span>
          </div>
          <div className="flex-1 h-px bg-gray-200 mx-2" />
          <div className="flex items-center space-x-2">
            {getStepIcon(2)}
            <span className={`text-sm ${currentStep >= 2 ? 'text-blue-600 font-medium' : 'text-gray-500'}`}>
              Contact Details
            </span>
          </div>
          <div className="flex-1 h-px bg-gray-200 mx-2" />
          <div className="flex items-center space-x-2">
            {getStepIcon(3)}
            <span className={`text-sm ${currentStep >= 3 ? 'text-blue-600 font-medium' : 'text-gray-500'}`}>
              Additional Info
            </span>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
          {/* Step 1: Basic Information */}
          {currentStep === 1 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <User className="h-5 w-5 text-gray-600" />
                <h3 className="text-lg font-medium">Basic Information</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name *</Label>
                  <Input
                    id="name"
                    {...register("name")}
                    placeholder="Enter devotee's full name"
                    className={errors.name ? "border-red-500" : ""}
                  />
                  {errors.name && (
                    <p className="text-sm text-red-500">{errors.name.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="age">Age</Label>
                  <Input
                    id="age"
                    type="number"
                    {...register("age", { valueAsNumber: true })}
                    placeholder="Enter age"
                    min="1"
                    max="120"
                  />
                  {errors.age && (
                    <p className="text-sm text-red-500">{errors.age.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="gender">Gender</Label>
                  <Select onValueChange={(value) => setValue("gender", value as "MALE" | "FEMALE" | "OTHER")}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select gender" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="MALE">Male</SelectItem>
                      <SelectItem value="FEMALE">Female</SelectItem>
                      <SelectItem value="OTHER">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="techAccessibility">Tech Access Level</Label>
                  <Select 
                    defaultValue="NO_ACCESS"
                    onValueChange={(value) => setValue("techAccessibility", value as "NO_ACCESS" | "LIMITED_ACCESS" | "ASSISTED_ACCESS" | "FULL_ACCESS")}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="NO_ACCESS">No smartphone/tech access</SelectItem>
                      <SelectItem value="LIMITED_ACCESS">Has phone, limited tech skills</SelectItem>
                      <SelectItem value="ASSISTED_ACCESS">Needs assistance with apps</SelectItem>
                      <SelectItem value="FULL_ACCESS">Comfortable with technology</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Minor Guardian Info */}
              {watchedFields.age && watchedFields.age < 18 && (
                <div className="bg-blue-50 p-4 rounded-lg space-y-4">
                  <h4 className="text-sm font-medium text-blue-900">Guardian Information (Required for minors)</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="guardianName">Guardian Name</Label>
                      <Input
                        id="guardianName"
                        {...register("guardianName")}
                        placeholder="Guardian's full name"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="guardianPhone">Guardian Phone</Label>
                      <Input
                        id="guardianPhone"
                        {...register("guardianPhone")}
                        placeholder="Guardian's phone number"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 2: Contact Details */}
          {currentStep === 2 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <Phone className="h-5 w-5 text-gray-600" />
                <h3 className="text-lg font-medium">Contact Information</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    {...register("phone")}
                    placeholder="Devotee's phone number"
                    type="tel"
                  />
                  {errors.phone && (
                    <p className="text-sm text-red-500">{errors.phone.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    {...register("email")}
                    placeholder="Devotee's email (optional)"
                    type="email"
                  />
                  {errors.email && (
                    <p className="text-sm text-red-500">{errors.email.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="emergencyContact">Emergency Contact</Label>
                  <Input
                    id="emergencyContact"
                    {...register("emergencyContact")}
                    placeholder="Emergency contact number"
                    type="tel"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="emergencyContactName">Emergency Contact Name</Label>
                  <Input
                    id="emergencyContactName"
                    {...register("emergencyContactName")}
                    placeholder="Emergency contact person name"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">Address</Label>
                <Textarea
                  id="address"
                  {...register("address")}
                  placeholder="Devotee's address (optional)"
                  rows={3}
                />
              </div>
            </div>
          )}

          {/* Step 3: Additional Information */}
          {currentStep === 3 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <FileText className="h-5 w-5 text-gray-600" />
                <h3 className="text-lg font-medium">Additional Information</h3>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    {...register("notes")}
                    placeholder="Any additional notes about the devotee or registration..."
                    rows={4}
                  />
                </div>

                {/* Category Summary */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="text-sm font-medium mb-2">Registration Summary</h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-gray-600">Category:</span>{" "}
                      <Badge variant="outline">{watchedFields.userCategory}</Badge>
                    </div>
                    <div>
                      <span className="text-gray-600">Method:</span>{" "}
                      <Badge variant="outline">{watchedFields.registrationMethod}</Badge>
                    </div>
                    <div>
                      <span className="text-gray-600">Tech Access:</span>{" "}
                      <Badge variant="outline">{watchedFields.techAccessibility}</Badge>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          <Separator />
          <div className="flex items-center justify-between">
            <div className="flex gap-2">
              {currentStep > 1 && (
                <Button type="button" variant="outline" onClick={prevStep}>
                  Previous
                </Button>
              )}
              {onCancel && (
                <Button type="button" variant="ghost" onClick={onCancel}>
                  Cancel
                </Button>
              )}
            </div>

            <div className="flex gap-2">
              {currentStep < 3 ? (
                <Button type="button" onClick={nextStep}>
                  Next
                </Button>
              ) : (
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "Registering..." : "Complete Registration"}
                </Button>
              )}
            </div>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}