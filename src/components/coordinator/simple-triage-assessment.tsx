"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Users,
  UserCheck,
  AlertTriangle,
  ArrowLeft,
  CheckCircle,
  Clock,
} from "lucide-react";
import { toast } from "sonner";

interface SimpleTriageAssessmentProps {
  onComplete: (assessment: {
    isNewDevotee: boolean;
    hasAppointment: boolean;
    isEmergency: boolean;
  }) => void;
  onCancel: () => void;
}

export function SimpleTriageAssessment({
  onComplete,
  onCancel,
}: SimpleTriageAssessmentProps) {
  const [selectedOption, setSelectedOption] = useState<string | null>(null);

  const handleOptionSelect = (option: string) => {
    setSelectedOption(option);
  };

  const handleContinue = () => {
    if (!selectedOption) {
      toast.error("Please select an option to continue");
      return;
    }

    // Route based on selection
    switch (selectedOption) {
      case "new-devotee":
        onComplete({
          isNewDevotee: true,
          hasAppointment: false,
          isEmergency: false,
        });
        break;
      case "existing-devotee":
        onComplete({
          isNewDevotee: false,
          hasAppointment: true,
          isEmergency: false,
        });
        break;
      case "emergency":
        onComplete({
          isNewDevotee: true,
          hasAppointment: false,
          isEmergency: true,
        });
        break;
      case "no-appointment":
        onComplete({
          isNewDevotee: false,
          hasAppointment: false,
          isEmergency: false,
        });
        break;
    }
  };

  const triageOptions = [
    {
      id: "new-devotee",
      title: "New Offline Devotee",
      description: "First time visiting, needs appointment booking",
      icon: Users,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
      borderColor: "border-blue-200",
    },
    {
      id: "existing-devotee",
      title: "Existing Offline Devotee with Appointment",
      description: "Has a scheduled appointment, needs check-in help",
      icon: UserCheck,
      color: "text-green-600",
      bgColor: "bg-green-50",
      borderColor: "border-green-200",
    },
    {
      id: "no-appointment",
      title: "Existing Offline Devotee without Appointment",
      description: "Visited before, needs new appointment booking",
      icon: Clock,
      color: "text-orange-600",
      bgColor: "bg-orange-50",
      borderColor: "border-orange-200",
    },
    {
      id: "emergency",
      title: "Emergency Offline Case",
      description: "Requires immediate priority appointment",
      icon: AlertTriangle,
      color: "text-red-600",
      bgColor: "bg-red-50",
      borderColor: "border-red-200",
    },
  ];

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="h-6 w-6 text-blue-600" />
            <CardTitle className="text-xl">
              Offline Devotee Assessment
            </CardTitle>
          </div>
          <Button variant="ghost" onClick={onCancel}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        <div className="text-center mb-6">
          <p className="text-gray-600">
            Please help us understand the offline devotee&apos;s situation to
            provide the best assistance.
          </p>
        </div>

        {/* Triage Options */}
        <div className="space-y-4">
          {triageOptions.map((option) => {
            const Icon = option.icon;
            const isSelected = selectedOption === option.id;

            return (
              <div
                key={option.id}
                className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                  isSelected
                    ? `${option.borderColor} ${option.bgColor} ring-2 ring-offset-2 ring-current`
                    : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                }`}
                onClick={() => handleOptionSelect(option.id)}
              >
                <div className="flex items-center space-x-4">
                  <div className={`p-3 rounded-lg ${option.bgColor}`}>
                    <Icon className={`h-6 w-6 ${option.color}`} />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-medium text-lg">{option.title}</h3>
                    <p className="text-gray-600 text-sm mt-1">
                      {option.description}
                    </p>
                  </div>
                  {isSelected && (
                    <CheckCircle className="h-6 w-6 text-green-600" />
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Instructions */}
        <div className="bg-blue-50 p-4 rounded-lg">
          <h4 className="font-medium text-blue-900 mb-2">
            Assessment Guidelines
          </h4>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>
              • <strong>New Offline Devotee:</strong> First-time visitors who
              need appointment booking
            </li>
            <li>
              • <strong>Existing with Appointment:</strong> Help with check-in
              process
            </li>
            <li>
              • <strong>Existing without Appointment:</strong> Help book a new
              appointment
            </li>
            <li>
              • <strong>Emergency:</strong> Urgent cases requiring immediate
              priority appointment
            </li>
          </ul>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-4">
          <Button variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
          <Button
            onClick={handleContinue}
            disabled={!selectedOption}
            className="min-w-[120px]"
          >
            Continue
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
