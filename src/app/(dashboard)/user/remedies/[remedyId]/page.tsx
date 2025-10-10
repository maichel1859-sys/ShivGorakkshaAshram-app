"use client";

import React from "react";
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
import { PageSpinner } from "@/components/loading";
import { useRemedyDocument } from "@/hooks/queries/use-remedies";
import { useLanguage } from "@/contexts/LanguageContext";
import { formatTimeIST, useTimeStore } from "@/store/time-store";


export default function UserRemedyDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const { t } = useLanguage();
  const remedyId = params.remedyId as string;

  const { data: remedy, isLoading, error } = useRemedyDocument(remedyId);

  if (error) {
    console.error('Error fetching remedy details:', error);
    toast.error(t('remedies.failedToLoad', 'Failed to load remedy details'));
  }

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

Prescribed on: ${useTimeStore.getState().formatDate(remedy.createdAt)}
Guruji: ${remedy.consultationSession?.appointment?.guruji?.name || 'N/A'}

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

  if (error && !isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <Card>
            <CardContent className="p-8 text-center">
              <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">Error Loading Remedy</h2>
              <p className="text-muted-foreground mb-4">
                {error?.message || t('remedies.notFound', 'Remedy not found')}
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

  if (!remedy && !isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <Card>
            <CardContent className="p-8 text-center">
              <AlertCircle className="h-12 w-12 text-gray-500 mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">Remedy Not Found</h2>
              <p className="text-muted-foreground mb-4">
                {t('remedies.notFound', 'Remedy not found')}
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
                        {remedy?.template?.name}
                      </h3>
                      <div className="flex flex-wrap gap-2 mb-3">
                        <Badge variant="secondary">
                          {remedy?.template?.type}
                        </Badge>
                        <Badge variant="outline">
                          {remedy?.template?.category}
                        </Badge>
                      </div>
                      {remedy?.template?.description && (
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
                        {remedy?.customInstructions || remedy?.template?.instructions}
                      </p>
                    </div>
                  </div>

                  {/* Dosage & Duration */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <h4 className="font-semibold">Dosage</h4>
                      <div className="bg-muted/50 p-3 rounded-lg">
                        <p className="text-sm">
                          {remedy?.customDosage || remedy?.template?.dosage || 'As prescribed'}
                        </p>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <h4 className="font-semibold">Duration</h4>
                      <div className="bg-muted/50 p-3 rounded-lg">
                        <p className="text-sm">
                          {remedy?.customDuration || remedy?.template?.duration || 'As needed'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Tags */}
                  {remedy?.template?.tags && remedy.template.tags.length > 0 && (
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
                {remedy?.consultationSession && (
                  <div className="grid grid-cols-1 gap-6">
                    {/* Devotee Info */}
                    <div className="space-y-3">
                      <h4 className="font-semibold">Devotee Information</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">
                            <strong>Name:</strong> {remedy.consultationSession?.appointment?.user?.name}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">
                            <strong>Email:</strong> {remedy.consultationSession?.appointment?.user?.email}
                          </span>
                        </div>
                        {remedy.consultationSession?.appointment?.user?.phone && (
                          <div className="flex items-center gap-2">
                            <Phone className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm">
                              <strong>Phone:</strong> {remedy.consultationSession.appointment.user.phone}
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
                            <strong>Date:</strong> {remedy.consultationSession?.appointment?.date ? useTimeStore.getState().formatDate(remedy.consultationSession.appointment.date) : 'N/A'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">
                            <strong>Time:</strong> {remedy.consultationSession?.appointment?.startTime ? formatTimeIST(remedy.consultationSession.appointment.startTime) : 'N/A'}
                          </span>
                        </div>
                        {remedy.consultationSession?.appointment?.reason && (
                          <div className="md:col-span-2">
                            <span className="text-sm">
                              <strong>Reason:</strong> {remedy.consultationSession.appointment.reason}
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
