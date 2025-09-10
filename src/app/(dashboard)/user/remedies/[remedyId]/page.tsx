"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Pill,
  User,
  Calendar,
  FileText,
  Clock,
  Download,
  ArrowLeft,
  Mail,
  Phone,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import { PageSpinner } from "@/components/ui/global-spinner";
import { getRemedyDetails } from "@/lib/actions/remedy-management-actions";

interface RemedyTemplate {
  id: string;
  name: string;
  type: string;
  category: string;
  description?: string | null;
  instructions: string;
  dosage?: string | null;
  duration?: string | null;
  tags: string[];
}

interface RemedyDocument {
  id: string;
  template: RemedyTemplate;
  customInstructions?: string | null;
  customDosage?: string | null;
  customDuration?: string | null;
  createdAt: string;
}

interface ConsultationSession {
  id: string;
  patient: {
    id: string;
    name: string;
    email: string;
    phone: string | null;
  };
  appointment: {
    id: string;
    date: string;
    startTime: string;
    reason?: string | null;
  };
}

export default function UserRemedyDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const [remedy, setRemedy] = useState<RemedyDocument | null>(null);
  const [consultation, setConsultation] = useState<ConsultationSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (params.remedyId) {
      fetchRemedyDetails(params.remedyId as string);
    }
  }, [params.remedyId]);

  const fetchRemedyDetails = async (remedyId: string) => {
    try {
      setIsLoading(true);
      setError(null);
      
      const result = await getRemedyDetails(remedyId);
      
      if (result.success && result.remedy) {
        // Transform to match local interface
        const transformedRemedy: RemedyDocument = {
          id: result.remedy.id,
          template: result.remedy.template,
          customInstructions: result.remedy.customInstructions,
          customDosage: result.remedy.customDosage,
          customDuration: result.remedy.customDuration,
          createdAt: result.remedy.createdAt instanceof Date ? result.remedy.createdAt.toISOString() : result.remedy.createdAt,
        };
        // Transform consultation session to match local interface
        const transformedConsultation: ConsultationSession = {
          id: result.remedy.consultationSession.id,
          patient: {
            id: result.remedy.consultationSession.patient.id,
            name: result.remedy.consultationSession.patient.name || '',
            email: result.remedy.consultationSession.patient.email || '',
            phone: result.remedy.consultationSession.patient.phone,
          },
          appointment: {
            id: result.remedy.consultationSession.appointment.id,
            date: result.remedy.consultationSession.appointment.date instanceof Date 
              ? result.remedy.consultationSession.appointment.date.toISOString()
              : result.remedy.consultationSession.appointment.date,
            startTime: result.remedy.consultationSession.appointment.startTime instanceof Date 
              ? result.remedy.consultationSession.appointment.startTime.toISOString()
              : result.remedy.consultationSession.appointment.startTime,
            reason: result.remedy.consultationSession.appointment.reason,
          },
        };
        setRemedy(transformedRemedy);
        setConsultation(transformedConsultation);
      } else {
        setError(result.error || 'Failed to fetch remedy details');
        toast.error(result.error || 'Failed to fetch remedy details');
      }
    } catch (error) {
      console.error('Error fetching remedy details:', error);
      setError('An unexpected error occurred');
      toast.error('Failed to load remedy details');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = () => {
    if (remedy?.template) {
      // Create a simple text file with remedy details
      const content = `
REMEDY PRESCRIPTION
==================

Remedy: ${remedy.template.name}
Type: ${remedy.template.type}
Category: ${remedy.template.category}

${remedy.template.description ? `Description: ${remedy.template.description}` : ''}

Instructions: ${remedy.customInstructions || remedy.template.instructions}
Dosage: ${remedy.customDosage || remedy.template.dosage || 'As prescribed'}
Duration: ${remedy.customDuration || remedy.template.duration || 'As needed'}

Prescribed on: ${new Date(remedy.createdAt).toLocaleDateString()}
Guruji: ${consultation?.patient.name || 'N/A'}

Om Shanti 🙏
      `.trim();

      const blob = new Blob([content], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${remedy.template.name.replace(/\s+/g, '_')}_prescription.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast.success('Remedy details downloaded');
    }
  };

  if (isLoading) {
    return <PageSpinner message="Loading remedy details..." />;
  }

  if (error || !remedy) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <Card>
            <CardContent className="p-8 text-center">
              <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">Error Loading Remedy</h2>
              <p className="text-muted-foreground mb-4">
                {error || 'Remedy not found'}
              </p>
              <Button onClick={() => router.back()}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Go Back
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button variant="outline" size="sm" onClick={() => router.back()}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">
                Remedy Details
              </h1>
              <p className="text-muted-foreground">
                Prescription and consultation information
              </p>
            </div>
          </div>
          <Button onClick={handleDownload}>
            <Download className="mr-2 h-4 w-4" />
            Download
          </Button>
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="details" className="w-full">
          <TabsList className="grid w-full grid-cols-2 gap-1">
            <TabsTrigger value="details" className="text-xs sm:text-sm">
              Remedy Details
            </TabsTrigger>
            <TabsTrigger value="consultation" className="text-xs sm:text-sm">
              Consultation Info
            </TabsTrigger>
          </TabsList>

          {/* Remedy Details Tab */}
          <TabsContent value="details" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Pill className="h-5 w-5" />
                  Remedy Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 gap-6">
                  {/* Basic Info */}
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-lg font-semibold mb-2">
                        {remedy.template.name}
                      </h3>
                      <div className="flex flex-wrap gap-2 mb-3">
                        <Badge variant="secondary">
                          {remedy.template.type}
                        </Badge>
                        <Badge variant="outline">
                          {remedy.template.category}
                        </Badge>
                      </div>
                      {remedy.template.description && (
                        <p className="text-muted-foreground">
                          {remedy.template.description}
                        </p>
                      )}
                    </div>
                  </div>

                  <Separator />

                  {/* Instructions */}
                  <div className="space-y-3">
                    <h4 className="font-semibold flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      Instructions
                    </h4>
                    <div className="bg-muted/50 p-4 rounded-lg">
                      <p className="text-sm">
                        {remedy.customInstructions || remedy.template.instructions}
                      </p>
                    </div>
                  </div>

                  {/* Dosage & Duration */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <h4 className="font-semibold">Dosage</h4>
                      <div className="bg-muted/50 p-3 rounded-lg">
                        <p className="text-sm">
                          {remedy.customDosage || remedy.template.dosage || 'As prescribed'}
                        </p>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <h4 className="font-semibold">Duration</h4>
                      <div className="bg-muted/50 p-3 rounded-lg">
                        <p className="text-sm">
                          {remedy.customDuration || remedy.template.duration || 'As needed'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Tags */}
                  {remedy.template.tags && remedy.template.tags.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="font-semibold">Tags</h4>
                      <div className="flex flex-wrap gap-2">
                        {remedy.template.tags.map((tag, index) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Consultation Info Tab */}
          <TabsContent value="consultation" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Consultation Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {consultation && (
                  <div className="grid grid-cols-1 gap-6">
                    {/* Patient Info */}
                    <div className="space-y-3">
                      <h4 className="font-semibold">Patient Information</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">
                            <strong>Name:</strong> {consultation.patient.name}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">
                            <strong>Email:</strong> {consultation.patient.email}
                          </span>
                        </div>
                        {consultation.patient.phone && (
                          <div className="flex items-center gap-2">
                            <Phone className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm">
                              <strong>Phone:</strong> {consultation.patient.phone}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    <Separator />

                    {/* Appointment Info */}
                    <div className="space-y-3">
                      <h4 className="font-semibold">Appointment Details</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">
                            <strong>Date:</strong> {new Date(consultation.appointment.date).toLocaleDateString()}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">
                            <strong>Time:</strong> {consultation.appointment.startTime}
                          </span>
                        </div>
                        {consultation.appointment.reason && (
                          <div className="md:col-span-2">
                            <span className="text-sm">
                              <strong>Reason:</strong> {consultation.appointment.reason}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

        </Tabs>
      </div>
    </div>
  );
}
