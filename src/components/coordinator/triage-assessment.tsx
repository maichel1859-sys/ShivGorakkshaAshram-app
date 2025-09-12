"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import {
  ClipboardList,
  Smartphone,
  Users,
  AlertTriangle,
  CheckCircle,
  UserCheck,
  Phone,
  Calendar,
  ArrowRight,
  HelpCircle,
} from "lucide-react";
import { type TriageAssessment } from "@/lib/validation/unified-schemas";

interface TriageAssessmentProps {
  onComplete: (assessment: TriageAssessment & { recommendedPath: string }) => void;
  onCancel?: () => void;
}

export function TriageAssessmentComponent({ onComplete, onCancel }: TriageAssessmentProps) {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [assessment, setAssessment] = useState<Partial<TriageAssessment>>({});

  const questions = [
    {
      id: "emergency",
      title: "Is this an emergency or urgent consultation?",
      description: "Serious medical condition requiring immediate attention",
      icon: AlertTriangle,
      color: "text-red-500",
      type: "boolean",
      field: "isEmergency",
    },
    {
      id: "appointment",
      title: "Do you have an existing appointment today?",
      description: "Check if patient has pre-booked appointment",
      icon: Calendar,
      color: "text-blue-500",
      type: "boolean",
      field: "hasAppointment",
    },
    {
      id: "existing",
      title: "Have you visited this ashram before?",
      description: "Check if patient is already in our system",
      icon: UserCheck,
      color: "text-green-500",
      type: "boolean",
      field: "existingPatient",
    },
    {
      id: "mobile",
      title: "Do you have a smartphone?",
      description: "Check for mobile device availability",
      icon: Smartphone,
      color: "text-purple-500",
      type: "boolean",
      field: "hasMobile",
    },
    {
      id: "app",
      title: "Are you comfortable using mobile apps?",
      description: "Assess tech comfort level",
      icon: Phone,
      color: "text-indigo-500",
      type: "boolean",
      field: "canUseApp",
      condition: () => assessment.hasMobile === true,
    },
    {
      id: "assistance",
      title: "Would you prefer assistance with booking?",
      description: "Determine level of help needed",
      icon: Users,
      color: "text-orange-500",
      type: "choice",
      field: "preferredMethod",
      options: [
        { value: "SELF_SERVICE", label: "I can do it myself", desc: "Use QR code/app independently" },
        { value: "ASSISTED", label: "I need some help", desc: "Coordinator guidance" },
        { value: "FAMILY_HELP", label: "Family member will help", desc: "Family/friend assistance" },
      ],
    },
  ];

  const currentQ = questions[currentQuestion];
  const isLastQuestion = currentQuestion === questions.length - 1;

  const handleAnswer = (value: string | boolean) => {
    const newAssessment = { ...assessment, [currentQ.field]: value };
    setAssessment(newAssessment);

    // Auto-advance for boolean questions
    if (currentQ.type === "boolean") {
      setTimeout(() => {
        if (isLastQuestion) {
          completeAssessment(newAssessment);
        } else {
          nextQuestion();
        }
      }, 500);
    }
  };

  const nextQuestion = () => {
    let next = currentQuestion + 1;
    
    // Skip conditional questions if condition not met
    while (next < questions.length) {
      const question = questions[next];
      if (!question.condition || question.condition()) {
        break;
      }
      next++;
    }

    if (next < questions.length) {
      setCurrentQuestion(next);
    } else {
      completeAssessment(assessment);
    }
  };

  const prevQuestion = () => {
    let prev = currentQuestion - 1;
    
    // Skip conditional questions if condition not met
    while (prev >= 0) {
      const question = questions[prev];
      if (!question.condition || question.condition()) {
        break;
      }
      prev--;
    }

    if (prev >= 0) {
      setCurrentQuestion(prev);
    }
  };

  const completeAssessment = (finalAssessment: Partial<TriageAssessment>) => {
    // Determine recommended path based on answers
    let recommendedPath = "ASSISTED";
    
    if (finalAssessment.isEmergency) {
      recommendedPath = "EMERGENCY";
    } else if (finalAssessment.hasAppointment && finalAssessment.hasMobile && finalAssessment.canUseApp) {
      recommendedPath = "SELF_CHECKIN";
    } else if (finalAssessment.hasAppointment) {
      recommendedPath = "COORDINATOR_CHECKIN";
    } else if (finalAssessment.hasMobile && finalAssessment.canUseApp && finalAssessment.preferredMethod === "SELF_SERVICE") {
      recommendedPath = "SELF_BOOKING";
    } else if (finalAssessment.existingPatient) {
      recommendedPath = "QUICK_BOOKING";
    } else {
      recommendedPath = "FULL_REGISTRATION";
    }

    const completeAssessment: TriageAssessment = {
      hasMobile: finalAssessment.hasMobile || false,
      canUseApp: finalAssessment.canUseApp,
      needsAssistance: finalAssessment.preferredMethod !== "SELF_SERVICE",
      isEmergency: finalAssessment.isEmergency || false,
      hasAppointment: finalAssessment.hasAppointment || false,
      existingPatient: finalAssessment.existingPatient,
      preferredMethod: finalAssessment.preferredMethod,
    };

    onComplete({
      ...completeAssessment,
      recommendedPath,
    });
  };

  const getRecommendationPreview = () => {
    const { isEmergency, hasAppointment, hasMobile, canUseApp } = assessment;
    
    if (isEmergency) {
      return {
        title: "Emergency Priority",
        description: "Direct to urgent queue",
        color: "bg-red-100 text-red-800",
        icon: AlertTriangle,
      };
    }
    
    if (hasAppointment && hasMobile && canUseApp) {
      return {
        title: "Self Check-in",
        description: "QR code scan recommended",
        color: "bg-green-100 text-green-800",
        icon: CheckCircle,
      };
    }
    
    if (hasAppointment) {
      return {
        title: "Coordinator Check-in",
        description: "Quick assisted check-in",
        color: "bg-blue-100 text-blue-800",
        icon: UserCheck,
      };
    }
    
    return {
      title: "Registration Needed",
      description: "New patient registration",
      color: "bg-yellow-100 text-yellow-800",
      icon: HelpCircle,
    };
  };

  const recommendation = getRecommendationPreview();

  return (
    <Card className="w-full max-w-lg mx-auto">
      <CardHeader>
        <div className="flex items-center gap-2">
          <ClipboardList className="h-6 w-6 text-blue-600" />
          <CardTitle>Patient Triage Assessment</CardTitle>
        </div>
        <div className="flex items-center justify-between text-sm text-gray-600">
          <span>Question {currentQuestion + 1} of {questions.length}</span>
          <span>{Math.round(((currentQuestion + 1) / questions.length) * 100)}% Complete</span>
        </div>
        
        {/* Progress Bar */}
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${((currentQuestion + 1) / questions.length) * 100}%` }}
          />
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Current Question */}
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <currentQ.icon className={`h-6 w-6 ${currentQ.color} mt-1`} />
            <div className="flex-1">
              <h3 className="text-lg font-medium">{currentQ.title}</h3>
              <p className="text-sm text-gray-600 mt-1">{currentQ.description}</p>
            </div>
          </div>

          {/* Answer Options */}
          <div className="space-y-3 ml-9">
            {currentQ.type === "boolean" && (
              <div className="grid grid-cols-2 gap-3">
                <Button
                  variant={assessment[currentQ.field as keyof typeof assessment] === true ? "default" : "outline"}
                  className="h-auto p-4 justify-start"
                  onClick={() => handleAnswer(true)}
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Yes
                </Button>
                <Button
                  variant={assessment[currentQ.field as keyof typeof assessment] === false ? "default" : "outline"}
                  className="h-auto p-4 justify-start"
                  onClick={() => handleAnswer(false)}
                >
                  <AlertTriangle className="h-4 w-4 mr-2" />
                  No
                </Button>
              </div>
            )}

            {currentQ.type === "choice" && currentQ.options && (
              <RadioGroup 
                value={assessment[currentQ.field as keyof typeof assessment] as string}
                onValueChange={(value) => handleAnswer(value)}
                className="space-y-3"
              >
                {currentQ.options.map((option) => (
                  <div key={option.value} className="flex items-start space-x-3 p-3 rounded-lg border hover:bg-gray-50">
                    <RadioGroupItem value={option.value} id={option.value} className="mt-0.5" />
                    <div className="flex-1">
                      <Label htmlFor={option.value} className="text-sm font-medium cursor-pointer">
                        {option.label}
                      </Label>
                      <p className="text-xs text-gray-600 mt-1">{option.desc}</p>
                    </div>
                  </div>
                ))}
              </RadioGroup>
            )}
          </div>
        </div>

        {/* Current Recommendation Preview */}
        {currentQuestion > 1 && (
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="text-sm font-medium mb-2">Current Recommendation:</h4>
            <div className="flex items-center gap-2">
              <Badge className={recommendation.color}>
                <recommendation.icon className="h-3 w-3 mr-1" />
                {recommendation.title}
              </Badge>
              <span className="text-sm text-gray-600">{recommendation.description}</span>
            </div>
          </div>
        )}

        {/* Navigation */}
        <Separator />
        <div className="flex items-center justify-between">
          <div className="flex gap-2">
            {currentQuestion > 0 && (
              <Button variant="outline" onClick={prevQuestion}>
                Previous
              </Button>
            )}
            {onCancel && (
              <Button variant="ghost" onClick={onCancel}>
                Cancel
              </Button>
            )}
          </div>

          <div className="flex gap-2">
            {currentQ.type === "choice" && (
              <Button 
                onClick={() => completeAssessment(assessment)}
                disabled={!assessment[currentQ.field as keyof typeof assessment]}
              >
                {isLastQuestion ? "Complete Assessment" : "Continue"}
                <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}