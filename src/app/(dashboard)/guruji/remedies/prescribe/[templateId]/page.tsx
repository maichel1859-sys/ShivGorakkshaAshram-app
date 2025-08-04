"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { DashboardLayout } from "@/components/dashboard/layout";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Heart,
  User,
  FileText,
  Send,
  Mail,
  MessageSquare,
  Eye,
  ArrowLeft,
} from "lucide-react";
import toast from "react-hot-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

interface RemedyTemplate {
  id: string;
  name: string;
  type: string;
  category: string;
  description?: string;
  instructions: string;
  dosage?: string;
  duration?: string;
  language: string;
  tags: string[];
}

interface Patient {
  id: string;
  name: string;
  email: string;
  phone?: string;
}

const prescriptionSchema = z.object({
  patientId: z.string().min(1, "Please select a patient"),
  customInstructions: z.string().optional(),
  customDosage: z.string().optional(),
  customDuration: z.string().optional(),
  sendEmail: z.boolean().default(true),
  sendSms: z.boolean().default(false),
  notes: z.string().optional(),
});

type PrescriptionFormData = z.infer<typeof prescriptionSchema>;

export default function PrescribeRemedyPage({
  params,
}: {
  params: Promise<{ templateId: string }>;
}) {
  const [template, setTemplate] = useState<RemedyTemplate | null>(null);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [templateId, setTemplateId] = useState<string>("");
  const router = useRouter();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<PrescriptionFormData>({
    resolver: zodResolver(prescriptionSchema),
    defaultValues: {
      sendEmail: true,
      sendSms: false,
    },
  });

  const watchedValues = watch();

  useEffect(() => {
    const initParams = async () => {
      const resolvedParams = await params;
      setTemplateId(resolvedParams.templateId);
    };
    initParams();
  }, [params]);

  const fetchTemplate = useCallback(async () => {
    try {
      const response = await fetch(`/api/remedies/templates/${templateId}`);
      if (response.ok) {
        const data = await response.json();
        setTemplate(data.template);
      } else {
        toast.error("Template not found");
        router.back();
      }
    } catch (error) {
      console.error("Failed to fetch template:", error);
      toast.error("Failed to load template");
    }
  }, [templateId, router]);

  const fetchPatients = useCallback(async () => {
    try {
      const response = await fetch("/api/guruji/patients");
      if (response.ok) {
        const data = await response.json();
        setPatients(data.patients);
      }
    } catch (error) {
      console.error("Failed to fetch patients:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (templateId) {
      fetchTemplate();
      fetchPatients();
    }
  }, [templateId, fetchTemplate, fetchPatients]);

  const onSubmit = async (data: PrescriptionFormData) => {
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/remedies/prescribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          templateId: templateId,
          ...data,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        toast.success("Remedy prescribed successfully!");

        // Optionally download PDF immediately
        if (result.pdfUrl) {
          window.open(result.pdfUrl, "_blank");
        }

        router.push("/guruji/remedies");
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to prescribe remedy");
      }
    } catch (error: unknown) {
      console.error("Prescription error:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Failed to prescribe remedy";
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePatientSelect = (patientId: string) => {
    const patient = patients.find((p) => p.id === patientId);
    setSelectedPatient(patient || null);
    setValue("patientId", patientId);
  };

  const generatePreview = async () => {
    if (!selectedPatient || !template) return;

    try {
      const response = await fetch("/api/remedies/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          templateId: templateId,
          patientId: selectedPatient.id,
          customInstructions: watchedValues.customInstructions,
          customDosage: watchedValues.customDosage,
          customDuration: watchedValues.customDuration,
        }),
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        window.open(url, "_blank");
      } else {
        toast.error("Failed to generate preview");
      }
    } catch (error) {
      console.error("Preview error:", error);
      toast.error("Failed to generate preview");
    }
  };

  if (isLoading || !template) {
    return (
      <DashboardLayout title="Prescribe Remedy" allowedRoles={["GURUJI"]}>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </DashboardLayout>
    );
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case "HOMEOPATHIC":
        return "bg-blue-100 text-blue-700";
      case "AYURVEDIC":
        return "bg-green-100 text-green-700";
      case "SPIRITUAL":
        return "bg-purple-100 text-purple-700";
      case "LIFESTYLE":
        return "bg-orange-100 text-orange-700";
      case "DIETARY":
        return "bg-yellow-100 text-yellow-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  return (
    <DashboardLayout title="Prescribe Remedy" allowedRoles={["GURUJI"]}>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center space-x-4">
          <Button variant="outline" size="sm" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h2 className="text-2xl font-bold tracking-tight">
              Prescribe Remedy
            </h2>
            <p className="text-muted-foreground">
              Create a personalized remedy prescription
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Template Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Heart className="h-5 w-5" />
                <span>Remedy Template</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="flex items-center space-x-2 mb-2">
                  <h3 className="text-lg font-medium">{template.name}</h3>
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-medium ${getTypeColor(
                      template.type
                    )}`}
                  >
                    {template.type}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">
                  {template.category}
                </p>
              </div>

              {template.description && (
                <div>
                  <h4 className="font-medium mb-1">Description</h4>
                  <p className="text-sm text-muted-foreground">
                    {template.description}
                  </p>
                </div>
              )}

              <div>
                <h4 className="font-medium mb-1">Instructions</h4>
                <p className="text-sm">{template.instructions}</p>
              </div>

              {template.dosage && (
                <div>
                  <h4 className="font-medium mb-1">Default Dosage</h4>
                  <p className="text-sm">{template.dosage}</p>
                </div>
              )}

              {template.duration && (
                <div>
                  <h4 className="font-medium mb-1">Default Duration</h4>
                  <p className="text-sm">{template.duration}</p>
                </div>
              )}

              {template.tags.length > 0 && (
                <div>
                  <h4 className="font-medium mb-1">Tags</h4>
                  <div className="flex flex-wrap gap-1">
                    {template.tags.map((tag, index) => (
                      <span
                        key={index}
                        className="px-2 py-0.5 bg-muted rounded text-xs"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Prescription Form */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <User className="h-5 w-5" />
                <span>Prescription Details</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                {/* Patient Selection */}
                <div className="space-y-2">
                  <Label htmlFor="patient">Select Patient</Label>
                  <Select onValueChange={handlePatientSelect}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose patient" />
                    </SelectTrigger>
                    <SelectContent>
                      {patients.map((patient) => (
                        <SelectItem key={patient.id} value={patient.id}>
                          <div>
                            <div className="font-medium">{patient.name}</div>
                            <div className="text-xs text-muted-foreground">
                              {patient.email}
                            </div>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.patientId && (
                    <p className="text-sm text-destructive">
                      {errors.patientId.message}
                    </p>
                  )}
                </div>

                {selectedPatient && (
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="font-medium">{selectedPatient.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {selectedPatient.email}
                    </p>
                    {selectedPatient.phone && (
                      <p className="text-sm text-muted-foreground">
                        {selectedPatient.phone}
                      </p>
                    )}
                  </div>
                )}

                <Separator />

                {/* Customizations */}
                <div className="space-y-4">
                  <h4 className="font-medium">Customize Prescription</h4>

                  <div className="space-y-2">
                    <Label htmlFor="customDosage">Custom Dosage</Label>
                    <Input
                      id="customDosage"
                      placeholder={template.dosage || "Enter dosage"}
                      {...register("customDosage")}
                    />
                    <p className="text-xs text-muted-foreground">
                      Leave empty to use template default
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="customDuration">Custom Duration</Label>
                    <Input
                      id="customDuration"
                      placeholder={template.duration || "Enter duration"}
                      {...register("customDuration")}
                    />
                    <p className="text-xs text-muted-foreground">
                      Leave empty to use template default
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="customInstructions">
                      Additional Instructions
                    </Label>
                    <Textarea
                      id="customInstructions"
                      placeholder="Any specific instructions for this patient..."
                      {...register("customInstructions")}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="notes">Private Notes</Label>
                    <Textarea
                      id="notes"
                      placeholder="Internal notes (not included in prescription)..."
                      {...register("notes")}
                    />
                  </div>
                </div>

                <Separator />

                {/* Delivery Options */}
                <div className="space-y-4">
                  <h4 className="font-medium">Delivery Options</h4>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="sendEmail"
                      checked={watchedValues.sendEmail}
                      onCheckedChange={(checked) =>
                        setValue("sendEmail", checked as boolean)
                      }
                    />
                    <Label
                      htmlFor="sendEmail"
                      className="flex items-center space-x-2"
                    >
                      <Mail className="h-4 w-4" />
                      <span>Send via Email</span>
                    </Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="sendSms"
                      checked={watchedValues.sendSms}
                      onCheckedChange={(checked) =>
                        setValue("sendSms", checked as boolean)
                      }
                    />
                    <Label
                      htmlFor="sendSms"
                      className="flex items-center space-x-2"
                    >
                      <MessageSquare className="h-4 w-4" />
                      <span>Send via SMS</span>
                    </Label>
                  </div>
                </div>

                <Separator />

                {/* Actions */}
                <div className="space-y-3">
                  <div className="flex space-x-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={generatePreview}
                      disabled={!selectedPatient}
                    >
                      <Eye className="mr-2 h-4 w-4" />
                      Preview PDF
                    </Button>
                  </div>

                  <Button
                    type="submit"
                    className="w-full"
                    disabled={isSubmitting || !selectedPatient}
                  >
                    {isSubmitting ? (
                      <>
                        <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-b-transparent" />
                        Prescribing...
                      </>
                    ) : (
                      <>
                        <Send className="mr-2 h-4 w-4" />
                        Prescribe Remedy
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Instructions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <FileText className="h-5 w-5" />
              <span>What happens next?</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-start space-x-3">
              <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium">
                1
              </div>
              <div>
                <p className="font-medium">PDF Generation</p>
                <p className="text-sm text-muted-foreground">
                  A personalized remedy document will be created with all
                  details
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium">
                2
              </div>
              <div>
                <p className="font-medium">Delivery</p>
                <p className="text-sm text-muted-foreground">
                  The remedy will be sent to the patient via selected delivery
                  methods
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium">
                3
              </div>
              <div>
                <p className="font-medium">Follow-up</p>
                <p className="text-sm text-muted-foreground">
                  Patient can access their remedies anytime from their dashboard
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
