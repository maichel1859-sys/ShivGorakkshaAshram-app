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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  AlertTriangle,
  User,
  Clock,
  Zap,
  Heart,
  Activity,
  CheckCircle,
} from "lucide-react";
import { toast } from "sonner";
import { emergencyQueueSchema, type EmergencyQueue } from "@/lib/validation/unified-schemas";
import { createEmergencyQueueEntry } from "@/lib/actions/reception-actions";

interface EmergencyQueueEntryProps {
  onSuccess: (emergencyData: EmergencyQueue) => void;
  onCancel?: () => void;
}

const emergencyTypes = [
  {
    id: "medical",
    label: "Medical Emergency",
    description: "Severe pain, breathing issues, bleeding",
    color: "bg-red-100 text-red-800",
    icon: Heart,
    priority: "URGENT",
  },
  {
    id: "psychiatric",
    label: "Mental Health Crisis",
    description: "Severe distress, panic attacks, behavioral crisis",
    color: "bg-orange-100 text-orange-800",
    icon: Activity,
    priority: "URGENT",
  },
  {
    id: "acute",
    label: "Acute Condition",
    description: "Sudden onset symptoms, severe discomfort",
    color: "bg-yellow-100 text-yellow-800",
    icon: Zap,
    priority: "HIGH",
  },
  {
    id: "elderly",
    label: "Elderly/Child Emergency",
    description: "Special care needs, frailty, vulnerability",
    color: "bg-blue-100 text-blue-800",
    icon: User,
    priority: "HIGH",
  },
];

export function EmergencyQueueEntry({ onSuccess, onCancel }: EmergencyQueueEntryProps) {
  const [selectedEmergencyType, setSelectedEmergencyType] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
    reset,
  } = useForm<EmergencyQueue>({
    resolver: zodResolver(emergencyQueueSchema),
    defaultValues: {
      priority: "URGENT",
      skipNormalQueue: true,
    },
  });

  const watchedFields = watch();

  const handleFormSubmit = async (data: EmergencyQueue) => {
    setIsSubmitting(true);
    
    try {
      // Add emergency type to the data
      const emergencyType = emergencyTypes.find(t => t.id === selectedEmergencyType);
      const emergencyData = {
        ...data,
        emergencyType: selectedEmergencyType,
        emergencyTypeLabel: emergencyType?.label,
        timestamp: new Date().toISOString(),
      };

      // Create FormData for server action
      const formData = new FormData();
      Object.entries(emergencyData).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== "") {
          formData.append(key, typeof value === "boolean" ? value.toString() : value.toString());
        }
      });

      // Call server action to create emergency queue entry
      const result = await createEmergencyQueueEntry(formData);
      
      if (!result.success) {
        toast.error(result.error || "Failed to register emergency patient");
        return;
      }
      
      toast.success("Emergency patient added to priority queue!");
      
      onSuccess(data);
      reset();
      setCurrentStep(1);
      setSelectedEmergencyType("");
    } catch (error) {
      console.error("Emergency registration error:", error);
      toast.error("Failed to register emergency patient. Please try again.");
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

  const selectedType = emergencyTypes.find(t => t.id === selectedEmergencyType);

  return (
    <Card className="w-full max-w-2xl mx-auto border-red-200">
      <CardHeader className="bg-red-50">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-6 w-6 text-red-600 animate-pulse" />
          <CardTitle className="text-xl text-red-800">Emergency Patient Registration</CardTitle>
          <Badge variant="destructive" className="ml-auto">
            PRIORITY
          </Badge>
        </div>
        
        {/* Progress Steps */}
        <div className="flex items-center justify-between mt-4">
          <div className="flex items-center space-x-2">
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
              currentStep >= 1 ? 'bg-red-600 text-white' : 'bg-gray-300 text-gray-600'
            }`}>
              1
            </div>
            <span className={`text-sm ${currentStep >= 1 ? 'text-red-700 font-medium' : 'text-gray-500'}`}>
              Emergency Type
            </span>
          </div>
          <div className="flex-1 h-px bg-gray-200 mx-2" />
          <div className="flex items-center space-x-2">
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
              currentStep >= 2 ? 'bg-red-600 text-white' : 'bg-gray-300 text-gray-600'
            }`}>
              2
            </div>
            <span className={`text-sm ${currentStep >= 2 ? 'text-red-700 font-medium' : 'text-gray-500'}`}>
              Patient Info
            </span>
          </div>
          <div className="flex-1 h-px bg-gray-200 mx-2" />
          <div className="flex items-center space-x-2">
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
              currentStep >= 3 ? 'bg-red-600 text-white' : 'bg-gray-300 text-gray-600'
            }`}>
              3
            </div>
            <span className={`text-sm ${currentStep >= 3 ? 'text-red-700 font-medium' : 'text-gray-500'}`}>
              Emergency Details
            </span>
          </div>
        </div>
      </CardHeader>

      <CardContent className="mt-6">
        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
          {/* Step 1: Emergency Type Selection */}
          {currentStep === 1 && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900">What type of emergency is this?</h3>
              
              <RadioGroup 
                value={selectedEmergencyType} 
                onValueChange={setSelectedEmergencyType}
                className="space-y-3"
              >
                {emergencyTypes.map((type) => (
                  <div 
                    key={type.id}
                    className={`flex items-start space-x-3 p-4 rounded-lg border-2 cursor-pointer transition-all ${
                      selectedEmergencyType === type.id 
                        ? 'border-red-500 bg-red-50' 
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                    onClick={() => setSelectedEmergencyType(type.id)}
                  >
                    <RadioGroupItem value={type.id} id={type.id} className="mt-1" />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <type.icon className={`h-5 w-5 ${selectedEmergencyType === type.id ? 'text-red-600' : 'text-gray-500'}`} />
                        <Label htmlFor={type.id} className="text-base font-medium cursor-pointer">
                          {type.label}
                        </Label>
                        <Badge className={type.color}>
                          {type.priority}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600">{type.description}</p>
                    </div>
                  </div>
                ))}
              </RadioGroup>

              {selectedType && (
                <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                  <div className="flex items-center gap-2 text-red-800">
                    <AlertTriangle className="h-4 w-4" />
                    <span className="text-sm font-medium">Emergency Priority: {selectedType.priority}</span>
                  </div>
                  <p className="text-sm text-red-700 mt-1">
                    This patient will be placed at the front of the queue and seen immediately.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Step 2: Patient Information */}
          {currentStep === 2 && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900">Patient Information</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="patientName">Patient Name *</Label>
                  <Input
                    id="patientName"
                    {...register("patientName")}
                    placeholder="Full name of the patient"
                    className={errors.patientName ? "border-red-500" : ""}
                  />
                  {errors.patientName && (
                    <p className="text-sm text-red-500">{errors.patientName.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="patientPhone">Patient Phone</Label>
                  <Input
                    id="patientPhone"
                    {...register("patientPhone")}
                    placeholder="Patient's phone number"
                    type="tel"
                  />
                </div>

                <div className="md:col-span-2 space-y-2">
                  <Label htmlFor="emergencyContactName">Emergency Contact Name *</Label>
                  <Input
                    id="emergencyContactName"
                    {...register("emergencyContactName")}
                    placeholder="Name of emergency contact person"
                    className={errors.emergencyContactName ? "border-red-500" : ""}
                  />
                  {errors.emergencyContactName && (
                    <p className="text-sm text-red-500">{errors.emergencyContactName.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="emergencyContact">Emergency Contact Number *</Label>
                  <Input
                    id="emergencyContact"
                    {...register("emergencyContact")}
                    placeholder="Emergency contact phone number"
                    type="tel"
                    className={errors.emergencyContact ? "border-red-500" : ""}
                  />
                  {errors.emergencyContact && (
                    <p className="text-sm text-red-500">{errors.emergencyContact.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="priority">Priority Level</Label>
                  <Select 
                    value={watchedFields.priority} 
                    onValueChange={(value) => setValue("priority", value as "HIGH" | "URGENT")}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="URGENT">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-red-500 rounded-full" />
                          Urgent - Life threatening
                        </div>
                      </SelectItem>
                      <SelectItem value="HIGH">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-orange-500 rounded-full" />
                          High - Severe symptoms
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Emergency Details */}
          {currentStep === 3 && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900">Emergency Details</h3>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="emergencyNature">Nature of Emergency *</Label>
                  <Textarea
                    id="emergencyNature"
                    {...register("emergencyNature")}
                    placeholder="Describe the emergency situation, symptoms, or condition..."
                    rows={4}
                    className={errors.emergencyNature ? "border-red-500" : ""}
                  />
                  {errors.emergencyNature && (
                    <p className="text-sm text-red-500">{errors.emergencyNature.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">Additional Notes</Label>
                  <Textarea
                    id="notes"
                    {...register("notes")}
                    placeholder="Any additional information that might be helpful..."
                    rows={3}
                  />
                </div>

                {/* Summary */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="text-sm font-medium mb-3">Emergency Registration Summary</h4>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-gray-600">Emergency Type:</span>{" "}
                      <Badge className={selectedType?.color}>
                        {selectedType?.label}
                      </Badge>
                    </div>
                    <div>
                      <span className="text-gray-600">Priority:</span>{" "}
                      <Badge variant={watchedFields.priority === "URGENT" ? "destructive" : "default"}>
                        {watchedFields.priority}
                      </Badge>
                    </div>
                    <div>
                      <span className="text-gray-600">Patient:</span>{" "}
                      <span className="font-medium">{watchedFields.patientName || "Not entered"}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Emergency Contact:</span>{" "}
                      <span className="font-medium">{watchedFields.emergencyContactName || "Not entered"}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                  <div className="flex items-start gap-2">
                    <Clock className="h-5 w-5 text-red-600 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-red-800">Priority Queue Placement</p>
                      <p className="text-sm text-red-700 mt-1">
                        This patient will skip the normal queue and be seen by the next available guruji immediately.
                      </p>
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
                <Button 
                  type="button" 
                  onClick={nextStep}
                  disabled={currentStep === 1 && !selectedEmergencyType}
                  className="bg-red-600 hover:bg-red-700"
                >
                  Next
                </Button>
              ) : (
                <Button 
                  type="submit" 
                  disabled={isSubmitting}
                  className="bg-red-600 hover:bg-red-700"
                >
                  {isSubmitting ? (
                    <>
                      <Clock className="h-4 w-4 mr-2 animate-spin" />
                      Processing Emergency...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Add to Emergency Queue
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