"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
// import { CalendarDays } from "@/components/ui/calendar";
import {
  Users,
  User,
  Calendar,
  Clock,
  AlertTriangle,
  CheckCircle,
  Heart,
  Shield,
} from "lucide-react";
import { toast } from "sonner";
import { familyBookingSchema, type FamilyBooking } from "@/lib/validation/unified-schemas";
import { useIsMobile } from "@/hooks/use-mobile";

interface FamilyBookingFormProps {
  onSuccess?: (bookingData: FamilyBooking) => void;
  onCancel?: () => void;
  availableGurujis?: Array<{ id: string; name: string; available: boolean }>;
}

export function FamilyBookingForm({ 
  onSuccess, 
  onCancel, 
  availableGurujis = [] 
}: FamilyBookingFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const isMobile = useIsMobile();

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
    reset,
  } = useForm<FamilyBooking>({
    resolver: zodResolver(familyBookingSchema),
    defaultValues: {
      priority: "NORMAL",
      consentGiven: false,
    },
  });

  const watchedFields = watch();

  // Generate available time slots
  useEffect(() => {
    if (selectedDate) {
      // Generate slots from 9 AM to 6 PM, 5-minute intervals
      const slots = [];
      for (let hour = 9; hour < 18; hour++) {
        for (let minute = 0; minute < 60; minute += 5) {
          const time = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
          slots.push(time);
        }
      }
      setAvailableSlots(slots);
    }
  }, [selectedDate]);

  const handleFormSubmit = async (data: FamilyBooking) => {
    if (!data.consentGiven) {
      toast.error("Devotee consent is required to proceed with booking");
      return;
    }

    setIsSubmitting(true);
    
    try {
      // Create FormData for server action
      const formData = new FormData();
      Object.entries(data).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== "") {
          formData.append(key, typeof value === "boolean" ? value.toString() : value.toString());
        }
      });

      // TODO: Call server action to create family booking
      // const result = await createFamilyBooking(formData);
      
      // Simulate success for now
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      toast.success("Family member appointment booked successfully!");
      
      if (onSuccess) {
        onSuccess(data);
      }
      
      reset();
      setCurrentStep(1);
      setSelectedDate(undefined);
    } catch (error) {
      console.error("Family booking error:", error);
      toast.error("Failed to book appointment. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const nextStep = () => {
    if (currentStep < 4) setCurrentStep(currentStep + 1);
  };

  const prevStep = () => {
    if (currentStep > 1) setCurrentStep(currentStep - 1);
  };

  const getRelationshipOptions = () => [
    "Spouse", "Parent", "Child", "Sibling", "Grandparent", 
    "Grandchild", "Uncle/Aunt", "Nephew/Niece", "Cousin", 
    "Friend", "Caregiver", "Legal Guardian", "Other"
  ];

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader className="pb-4 sm:pb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-2">
            <Users className="h-6 w-6 text-blue-600" />
            <CardTitle className={isMobile ? "text-lg" : "text-xl"}>Family/Proxy Booking</CardTitle>
          </div>
          <Badge variant="outline" className="bg-blue-50 text-blue-700 self-start sm:self-auto">
            <Heart className="h-3 w-3 mr-1" />
            Family Care
          </Badge>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center justify-between mt-4">
          {[1, 2, 3, 4].map((step) => (
            <div key={step} className="flex items-center flex-1">
              <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-sm font-medium touch-target ${
                currentStep >= step ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'
              }`}>
                {step}
              </div>
              {step < 4 && (
                <div className={`flex-1 h-px mx-1 sm:mx-2 ${
                  currentStep > step ? 'bg-blue-600' : 'bg-gray-200'
                }`} />
              )}
            </div>
          ))}
        </div>

        <div className="text-center text-sm text-gray-600 mt-2">
          {currentStep === 1 && "Devotee Information"}
          {currentStep === 2 && "Booker Details"}
          {currentStep === 3 && "Appointment Details"}
          {currentStep === 4 && "Consent & Confirmation"}
        </div>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
          {/* Step 1: Devotee Information */}
          {currentStep === 1 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <User className="h-5 w-5 text-gray-600" />
                <h3 className="text-lg font-medium">Devotee Information</h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="devoteeName" className="text-sm font-medium">Devotee Full Name *</Label>
                  <Input
                    id="devoteeName"
                    {...register("devoteeName")}
                    placeholder="Enter devotee's full name"
                    className={`h-11 touch-target ${errors.devoteeName ? "border-red-500" : ""}`}
                  />
                  {errors.devoteeName && (
                    <p className="text-sm text-red-500">{errors.devoteeName.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="devoteePhone">Devotee Phone</Label>
                  <Input
                    id="devoteePhone"
                    {...register("devoteePhone")}
                    placeholder="Devotee's phone number"
                    type="tel"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="devoteeEmail">Devotee Email</Label>
                  <Input
                    id="devoteeEmail"
                    {...register("devoteeEmail")}
                    placeholder="Devotee's email address"
                    type="email"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="devoteeAge">Devotee Age</Label>
                  <Input
                    id="devoteeAge"
                    type="number"
                    {...register("devoteeAge", { valueAsNumber: true })}
                    placeholder="Age"
                    min="1"
                    max="120"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="devoteeGender">Devotee Gender</Label>
                  <Select onValueChange={(value) => setValue("devoteeGender", value as "MALE" | "FEMALE" | "OTHER")}>
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
              </div>

              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="flex items-start gap-2">
                  <Shield className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-blue-800">Privacy Notice</p>
                    <p className="text-sm text-blue-700 mt-1">
                      You are booking an appointment on behalf of another person. Please ensure you have their 
                      consent and are authorized to share their medical information.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Booker Details */}
          {currentStep === 2 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <Users className="h-5 w-5 text-gray-600" />
                <h3 className="text-lg font-medium">Your Information (Person Booking)</h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="bookerName">Your Full Name *</Label>
                  <Input
                    id="bookerName"
                    {...register("bookerName")}
                    placeholder="Your full name"
                    className={errors.bookerName ? "border-red-500" : ""}
                  />
                  {errors.bookerName && (
                    <p className="text-sm text-red-500">{errors.bookerName.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bookerPhone">Your Phone Number *</Label>
                  <Input
                    id="bookerPhone"
                    {...register("bookerPhone")}
                    placeholder="Your phone number"
                    type="tel"
                    className={errors.bookerPhone ? "border-red-500" : ""}
                  />
                  {errors.bookerPhone && (
                    <p className="text-sm text-red-500">{errors.bookerPhone.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bookerEmail">Your Email</Label>
                  <Input
                    id="bookerEmail"
                    {...register("bookerEmail")}
                    placeholder="Your email address"
                    type="email"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="relationship">Relationship to Devotee *</Label>
                  <Select onValueChange={(value) => setValue("relationship", value)}>
                    <SelectTrigger className={errors.relationship ? "border-red-500" : ""}>
                      <SelectValue placeholder="Select relationship" />
                    </SelectTrigger>
                    <SelectContent>
                      {getRelationshipOptions().map((relation) => (
                        <SelectItem key={relation} value={relation}>
                          {relation}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.relationship && (
                    <p className="text-sm text-red-500">{errors.relationship.message}</p>
                  )}
                </div>
              </div>

              <div className="bg-yellow-50 p-4 rounded-lg">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-yellow-800">Authorization Required</p>
                    <p className="text-sm text-yellow-700 mt-1">
                      By providing this information, you confirm that you are authorized to book medical 
                      appointments for {watchedFields.devoteeName || "this devotee"}.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Appointment Details */}
          {currentStep === 3 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <Calendar className="h-5 w-5 text-gray-600" />
                <h3 className="text-lg font-medium">Appointment Details</h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="gurujiId">Select Guruji *</Label>
                  <Select onValueChange={(value) => setValue("gurujiId", value)}>
                    <SelectTrigger className={errors.gurujiId ? "border-red-500" : ""}>
                      <SelectValue placeholder="Choose a guruji" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableGurujis.map((guruji) => (
                        <SelectItem key={guruji.id} value={guruji.id} disabled={!guruji.available}>
                          <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${
                              guruji.available ? 'bg-green-500' : 'bg-gray-400'
                            }`} />
                            {guruji.name}
                            {!guruji.available && " (Unavailable)"}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.gurujiId && (
                    <p className="text-sm text-red-500">{errors.gurujiId.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="appointmentDate">Appointment Date *</Label>
                  <Input
                    id="appointmentDate"
                    type="date"
                    {...register("appointmentDate")}
                    min={new Date().toISOString().split('T')[0]}
                    className={errors.appointmentDate ? "border-red-500" : ""}
                    onChange={(e) => {
                      setValue("appointmentDate", e.target.value);
                      setSelectedDate(new Date(e.target.value));
                    }}
                  />
                  {errors.appointmentDate && (
                    <p className="text-sm text-red-500">{errors.appointmentDate.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="appointmentTime">Appointment Time *</Label>
                  <Select onValueChange={(value) => setValue("appointmentTime", value)}>
                    <SelectTrigger className={errors.appointmentTime ? "border-red-500" : ""}>
                      <SelectValue placeholder="Select time" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableSlots.map((slot) => (
                        <SelectItem key={slot} value={slot}>
                          {slot}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.appointmentTime && (
                    <p className="text-sm text-red-500">{errors.appointmentTime.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="priority">Priority Level</Label>
                  <Select 
                    defaultValue="NORMAL" 
                    onValueChange={(value) => setValue("priority", value as "LOW" | "NORMAL" | "HIGH" | "URGENT")}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="LOW">Low Priority</SelectItem>
                      <SelectItem value="NORMAL">Normal Priority</SelectItem>
                      <SelectItem value="HIGH">High Priority</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="reason">Reason for Consultation *</Label>
                <Textarea
                  id="reason"
                  {...register("reason")}
                  placeholder="Please describe the reason for this appointment..."
                  rows={3}
                  className={errors.reason ? "border-red-500" : ""}
                />
                {errors.reason && (
                  <p className="text-sm text-red-500">{errors.reason.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Additional Notes</Label>
                <Textarea
                  id="notes"
                  {...register("notes")}
                  placeholder="Any additional information or special requirements..."
                  rows={2}
                />
              </div>
            </div>
          )}

          {/* Step 4: Consent & Confirmation */}
          {currentStep === 4 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <Shield className="h-5 w-5 text-gray-600" />
                <h3 className="text-lg font-medium">Consent & Confirmation</h3>
              </div>

              {/* Appointment Summary */}
              <div className="bg-gray-50 p-4 rounded-lg space-y-3">
                <h4 className="font-medium">Appointment Summary</h4>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-gray-600">Devotee:</span>{" "}
                    <span className="font-medium">{watchedFields.devoteeName}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Booker:</span>{" "}
                    <span className="font-medium">{watchedFields.bookerName}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Relationship:</span>{" "}
                    <span className="font-medium">{watchedFields.relationship}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Date & Time:</span>{" "}
                    <span className="font-medium">
                      {watchedFields.appointmentDate} at {watchedFields.appointmentTime}
                    </span>
                  </div>
                </div>
              </div>

              {/* Consent Checkbox */}
              <div className="space-y-4">
                <div className="flex items-start space-x-3 p-4 border rounded-lg">
                  <Checkbox 
                    id="consent"
                    checked={watchedFields.consentGiven}
                    onCheckedChange={(checked) => setValue("consentGiven", checked as boolean)}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <Label htmlFor="consent" className="text-sm font-medium cursor-pointer">
                      Devotee Consent Confirmation *
                    </Label>
                    <p className="text-sm text-gray-600 mt-1">
                      I confirm that I have the explicit consent of{" "}
                      <strong>{watchedFields.devoteeName || "the devotee"}</strong> to:
                    </p>
                    <ul className="text-xs text-gray-600 mt-2 space-y-1 ml-4">
                      <li>• Book this medical appointment on their behalf</li>
                      <li>• Share their personal and contact information</li>
                      <li>• Receive updates about their appointment</li>
                      <li>• Act as their authorized representative for this booking</li>
                    </ul>
                  </div>
                </div>

                {!watchedFields.consentGiven && (
                  <div className="bg-red-50 p-3 rounded-lg border border-red-200">
                    <p className="text-sm text-red-700">
                      <AlertTriangle className="h-4 w-4 inline mr-1" />
                      Devotee consent is required to proceed with the booking.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          <Separator />
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex gap-2 order-2 sm:order-1">
              {currentStep > 1 && (
                <Button type="button" variant="outline" onClick={prevStep} className="h-11 touch-target">
                  Previous
                </Button>
              )}
              {onCancel && (
                <Button type="button" variant="ghost" onClick={onCancel} className="h-11 touch-target">
                  Cancel
                </Button>
              )}
            </div>

            <div className="flex gap-2 order-1 sm:order-2">
              {currentStep < 4 ? (
                <Button type="button" onClick={nextStep} className="h-11 px-6 touch-target">
                  Next
                </Button>
              ) : (
                <Button 
                  type="submit" 
                  disabled={isSubmitting || !watchedFields.consentGiven}
                  className="h-11 px-6 touch-target"
                >
                  {isSubmitting ? (
                    <>
                      <Clock className="h-4 w-4 mr-2 animate-spin" />
                      {isMobile ? "Booking..." : "Booking Appointment..."}
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      {isMobile ? "Confirm" : "Confirm Booking"}
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}