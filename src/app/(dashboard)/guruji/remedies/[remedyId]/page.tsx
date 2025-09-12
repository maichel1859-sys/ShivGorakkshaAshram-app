"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Pill,
  User,
  Calendar,
  FileText,
  Edit,
  Download,
  Share2,
  MessageSquare,
  Mail,
  Phone,
  ArrowLeft,
  Save,
  X,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
import { PageSpinner } from "@/components/loading";

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
  pdfUrl?: string | null;
  emailSent: boolean;
  smsSent: boolean;
  deliveredAt?: string | null;
}

interface ConsultationSession {
  id: string;
  startTime: string;
  endTime?: string | null;
  diagnosis?: string | null;
  notes?: string | null;
  patient: {
    id: string;
    name: string | null;
    email: string | null;
    phone: string | null;
  };
}

export default function RemedyDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const [remedy, setRemedy] = useState<RemedyDocument | null>(null);
  const [consultation, setConsultation] = useState<ConsultationSession | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedRemedy, setEditedRemedy] = useState({
    customInstructions: "",
    customDosage: "",
    customDuration: "",
  });

  const fetchRemedyDetails = useCallback(async (remedyId: string) => {
    try {
      setIsLoading(true);
      // TODO: Replace with actual API call
      // const response = await fetch(`/api/remedies/${remedyId}`);
      // const data = await response.json();
      
      // Mock data for now
      const mockRemedy: RemedyDocument = {
        id: remedyId,
        template: {
          id: "template-1",
          name: "Ayurvedic Digestive Tonic",
          type: "AYURVEDIC",
          category: "Digestive Health",
          description: "Traditional ayurvedic formula for digestive wellness",
          instructions: "Take 1 teaspoon twice daily with warm water before meals",
          dosage: "1 teaspoon",
          duration: "30 days",
          tags: ["digestive", "tonic", "ayurvedic"],
        },
        customInstructions: "Take on empty stomach in the morning",
        customDosage: "2 teaspoons",
        customDuration: "45 days",
        createdAt: new Date().toISOString(),
        emailSent: true,
        smsSent: false,
        deliveredAt: new Date().toISOString(),
      };

      const mockConsultation: ConsultationSession = {
        id: "consultation-1",
        startTime: new Date().toISOString(),
        endTime: new Date().toISOString(),
        diagnosis: "Mild digestive discomfort",
        notes: "Patient reports occasional bloating and irregular digestion",
        patient: {
          id: "patient-1",
          name: "John Doe",
          email: "john.doe@example.com",
          phone: "+1234567890",
        },
      };

      setRemedy(mockRemedy);
      setConsultation(mockConsultation);
      setEditedRemedy({
        customInstructions: mockRemedy.customInstructions || "",
        customDosage: mockRemedy.customDosage || "",
        customDuration: mockRemedy.customDuration || "",
      });
    } catch (error) {
      console.error("Failed to fetch remedy details:", error);
      toast.error("Failed to load remedy details");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (params.remedyId) {
      fetchRemedyDetails(params.remedyId as string);
    }
  }, [params.remedyId, fetchRemedyDetails]);

  const handleSave = async () => {
    try {
      // TODO: Implement update remedy functionality
      // const response = await fetch(`/api/remedies/${remedy?.id}`, {
      //   method: 'PUT',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(editedRemedy),
      // });

      if (remedy) {
        setRemedy({
          ...remedy,
          customInstructions: editedRemedy.customInstructions,
          customDosage: editedRemedy.customDosage,
          customDuration: editedRemedy.customDuration,
        });
      }
      
      toast.success("Remedy updated successfully");
      setIsEditing(false);
    } catch {
      toast.error("Failed to update remedy");
    }
  };

  const handleDownloadPDF = () => {
    if (remedy?.pdfUrl) {
      window.open(remedy.pdfUrl, '_blank');
    } else {
      toast.info("PDF generation coming soon");
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Remedy: ${remedy?.template.name}`,
          text: `Remedy prescribed for ${consultation?.patient.name}`,
          url: window.location.href,
        });
      } catch (error) {
        console.log('Error sharing:', error);
      }
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast.success("Link copied to clipboard");
    }
  };

  const handleContact = (method: 'phone' | 'email' | 'sms') => {
    if (!consultation?.patient) return;

    switch (method) {
      case 'phone':
        if (consultation.patient.phone) {
          window.open(`tel:${consultation.patient.phone}`, '_blank');
        } else {
          toast.error("No phone number available");
        }
        break;
      case 'email':
        if (consultation.patient.email) {
          window.open(`mailto:${consultation.patient.email}`, '_blank');
        } else {
          toast.error("No email available");
        }
        break;
      case 'sms':
        if (consultation.patient.phone) {
          window.open(`sms:${consultation.patient.phone}`, '_blank');
        } else {
          toast.error("No phone number available");
        }
        break;
    }
  };

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

  if (isLoading) {
    return <PageSpinner message="Loading remedy details..." />;
  }

  if (!remedy || !consultation) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-red-600 mb-2">
            Remedy Not Found
          </h3>
          <p className="text-muted-foreground mb-4">
            The remedy you&apos;re looking for doesn&apos;t exist or you don&apos;t have permission to view it.
          </p>
          <Button onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center space-x-4">
          <Button variant="outline" size="sm" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
              Remedy Details
            </h1>
            <p className="text-muted-foreground text-sm sm:text-base">
              Complete information about the prescribed remedy
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={() => setIsEditing(!isEditing)}
            className="flex-1 sm:flex-none"
          >
            <Edit className="h-4 w-4 mr-2" />
            {isEditing ? 'Cancel' : 'Edit'}
          </Button>
          <Button
            variant="outline"
            onClick={handleDownloadPDF}
            className="flex-1 sm:flex-none"
          >
            <Download className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Download PDF</span>
            <span className="sm:hidden">PDF</span>
          </Button>
          <Button
            variant="outline"
            onClick={handleShare}
            className="flex-1 sm:flex-none"
          >
            <Share2 className="h-4 w-4 mr-2" />
            Share
          </Button>
        </div>
      </div>

      {/* Remedy Overview */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
                <Pill className="h-8 w-8 text-primary" />
              </div>
              <div>
                <CardTitle className="text-2xl">{remedy.template.name}</CardTitle>
                <div className="flex items-center gap-2 mt-2">
                  <Badge className={getTypeColor(remedy.template.type)}>
                    {remedy.template.type}
                  </Badge>
                  <Badge variant="outline">{remedy.template.category}</Badge>
                </div>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Prescribed on</p>
              <p className="font-medium">
                {new Date(remedy.createdAt).toLocaleDateString()}
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {remedy.template.description && (
            <p className="text-muted-foreground mb-4">
              {remedy.template.description}
            </p>
          )}
          
          {remedy.template.tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {remedy.template.tags.map((tag, index) => (
                <Badge key={index} variant="secondary">
                  {tag}
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Main Content Tabs */}
      <Tabs defaultValue="details" className="w-full">
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 gap-1">
          <TabsTrigger value="details" className="text-xs sm:text-sm">Remedy Details</TabsTrigger>
          <TabsTrigger value="patient" className="text-xs sm:text-sm">Patient Info</TabsTrigger>
          <TabsTrigger value="consultation" className="text-xs sm:text-sm">Consultation</TabsTrigger>
          <TabsTrigger value="delivery" className="text-xs sm:text-sm">Delivery Status</TabsTrigger>
        </TabsList>

        {/* Remedy Details Tab */}
        <TabsContent value="details" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Remedy Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 gap-6">
                <div>
                  <h4 className="font-medium mb-3">Template Instructions</h4>
                  <div className="p-4 bg-muted rounded-lg">
                    <p className="text-sm">{remedy.template.instructions}</p>
                  </div>
                </div>
                <div>
                  <h4 className="font-medium mb-3">Custom Instructions</h4>
                  {isEditing ? (
                    <Textarea
                      value={editedRemedy.customInstructions}
                      onChange={(e) => setEditedRemedy(prev => ({
                        ...prev,
                        customInstructions: e.target.value
                      }))}
                      placeholder="Enter custom instructions..."
                      rows={4}
                    />
                  ) : (
                    <div className="p-4 bg-muted rounded-lg">
                      <p className="text-sm">
                        {remedy.customInstructions || "No custom instructions"}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <Separator />

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                <div>
                  <Label htmlFor="dosage">Dosage</Label>
                  {isEditing ? (
                    <Input
                      id="dosage"
                      value={editedRemedy.customDosage}
                      onChange={(e) => setEditedRemedy(prev => ({
                        ...prev,
                        customDosage: e.target.value
                      }))}
                      placeholder={remedy.template.dosage || "Enter dosage"}
                      className="mt-2"
                    />
                  ) : (
                    <div className="mt-2 p-3 bg-muted rounded-md">
                      <p className="text-sm">
                        {remedy.customDosage || remedy.template.dosage || "Not specified"}
                      </p>
                    </div>
                  )}
                </div>
                <div>
                  <Label htmlFor="duration">Duration</Label>
                  {isEditing ? (
                    <Input
                      id="duration"
                      value={editedRemedy.customDuration}
                      onChange={(e) => setEditedRemedy(prev => ({
                        ...prev,
                        customDuration: e.target.value
                      }))}
                      placeholder={remedy.template.duration || "Enter duration"}
                      className="mt-2"
                    />
                  ) : (
                    <div className="mt-2 p-3 bg-muted rounded-md">
                      <p className="text-sm">
                        {remedy.customDuration || remedy.template.duration || "Not specified"}
                      </p>
                    </div>
                  )}
                </div>
                <div>
                  <Label>Prescribed On</Label>
                  <div className="mt-2 p-3 bg-muted rounded-md">
                    <p className="text-sm">
                      {new Date(remedy.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </div>

              {isEditing && (
                <div className="flex flex-col sm:flex-row gap-2 pt-4">
                  <Button onClick={handleSave} className="flex-1 sm:flex-none">
                    <Save className="h-4 w-4 mr-2" />
                    Save Changes
                  </Button>
                  <Button variant="outline" onClick={() => setIsEditing(false)} className="flex-1 sm:flex-none">
                    <X className="h-4 w-4 mr-2" />
                    Cancel
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Patient Tab */}
        <TabsContent value="patient" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Patient Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 gap-6">
                <div>
                  <h4 className="font-medium mb-3">Basic Information</h4>
                  <div className="space-y-3">
                    <div>
                      <Label>Name</Label>
                      <div className="mt-1 p-3 bg-muted rounded-md">
                        <p className="text-sm">
                          {consultation.patient.name || "Not provided"}
                        </p>
                      </div>
                    </div>
                    <div>
                      <Label>Patient ID</Label>
                      <div className="mt-1 p-3 bg-muted rounded-md">
                        <p className="text-sm font-mono">
                          {consultation.patient.id}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
                <div>
                  <h4 className="font-medium mb-3">Contact Methods</h4>
                  <div className="space-y-3">
                    {consultation.patient.phone && (
                      <Button
                        variant="outline"
                        onClick={() => handleContact('phone')}
                        className="w-full justify-start"
                      >
                        <Phone className="h-4 w-4 mr-2" />
                        {consultation.patient.phone}
                      </Button>
                    )}
                    {consultation.patient.email && (
                      <Button
                        variant="outline"
                        onClick={() => handleContact('email')}
                        className="w-full justify-start"
                      >
                        <Mail className="h-4 w-4 mr-2" />
                        {consultation.patient.email}
                      </Button>
                    )}
                    {consultation.patient.phone && (
                      <Button
                        variant="outline"
                        onClick={() => handleContact('sms')}
                        className="w-full justify-start"
                      >
                        <MessageSquare className="h-4 w-4 mr-2" />
                        Send SMS
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Consultation Tab */}
        <TabsContent value="consultation" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Consultation Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 gap-6">
                <div>
                  <h4 className="font-medium mb-3">Timing</h4>
                  <div className="space-y-3">
                    <div>
                      <Label>Date</Label>
                      <div className="mt-1 p-3 bg-muted rounded-md">
                        <p className="text-sm">
                          {new Date(consultation.startTime).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div>
                      <Label>Time</Label>
                      <div className="mt-1 p-3 bg-muted rounded-md">
                        <p className="text-sm">
                          {new Date(consultation.startTime).toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
                <div>
                  <h4 className="font-medium mb-3">Medical Information</h4>
                  <div className="space-y-3">
                    {consultation.diagnosis && (
                      <div>
                        <Label>Diagnosis</Label>
                        <div className="mt-1 p-3 bg-muted rounded-md">
                          <p className="text-sm">{consultation.diagnosis}</p>
                        </div>
                      </div>
                    )}
                    {consultation.notes && (
                      <div>
                        <Label>Notes</Label>
                        <div className="mt-1 p-3 bg-muted rounded-md">
                          <p className="text-sm">{consultation.notes}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Delivery Tab */}
        <TabsContent value="delivery" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Delivery Status
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 gap-6">
                <div>
                  <h4 className="font-medium mb-3">Email Delivery</h4>
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Badge variant={remedy.emailSent ? "default" : "secondary"}>
                        {remedy.emailSent ? "Sent" : "Pending"}
                      </Badge>
                      {remedy.emailSent && (
                        <span className="text-xs text-muted-foreground">
                          ✓ Delivered
                        </span>
                      )}
                    </div>
                    {remedy.deliveredAt && (
                      <div>
                        <Label>Delivered On</Label>
                        <div className="mt-1 p-3 bg-muted rounded-md">
                          <p className="text-sm">
                            {new Date(remedy.deliveredAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                <div>
                  <h4 className="font-medium mb-3">SMS Delivery</h4>
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Badge variant={remedy.smsSent ? "default" : "secondary"}>
                        {remedy.smsSent ? "Sent" : "Pending"}
                      </Badge>
                      {remedy.smsSent && (
                        <span className="text-xs text-muted-foreground">
                          ✓ Delivered
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <Separator />

              <div>
                <h4 className="font-medium mb-3">Actions</h4>
                <div className="flex flex-col sm:flex-row gap-3">
                  <Button
                    variant="outline"
                    onClick={() => handleContact('email')}
                    disabled={!consultation.patient.email}
                    className="flex-1 sm:flex-none"
                  >
                    <Mail className="h-4 w-4 mr-2" />
                    Resend Email
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => handleContact('sms')}
                    disabled={!consultation.patient.phone}
                    className="flex-1 sm:flex-none"
                  >
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Resend SMS
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleDownloadPDF}
                    className="flex-1 sm:flex-none"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Generate PDF
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
