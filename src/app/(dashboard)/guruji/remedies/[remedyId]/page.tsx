"use client";

import { useState, useEffect, useMemo } from "react";
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
import { useTimeStore } from "@/store/time-store";
import { useRemedyTemplate } from "@/hooks/queries/use-remedies";
import { updateRemedyTemplate } from "@/lib/actions/remedy-actions";

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
  devotee: {
    id: string;
    name: string | null;
    email: string | null;
    phone: string | null;
  };
}

export default function RemedyDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [editedRemedy, setEditedRemedy] = useState({
    customInstructions: "",
    customDosage: "",
    customDuration: "",
  });

  // Use React Query hook for data fetching
  const {
    data: templateData,
    isLoading,
    error,
  } = useRemedyTemplate(params.remedyId as string);

  // Transform template data to RemedyDocument format for compatibility
  const remedy = useMemo(() => {
    return templateData ? {
      id: params.remedyId as string,
      template: {
        id: templateData.id,
        name: templateData.name,
        type: templateData.type,
        category: templateData.category,
        description: templateData.description,
        instructions: templateData.instructions || '',
        dosage: templateData.dosage,
        duration: templateData.duration,
        tags: templateData.tags || [],
      },
      customInstructions: templateData.description || '',
      customDosage: templateData.dosage || '',
      customDuration: templateData.duration || '',
      createdAt: templateData.createdAt.toISOString(),
      emailSent: false,
      smsSent: false,
      deliveredAt: templateData.createdAt.toISOString(),
    } as RemedyDocument : null;
  }, [templateData, params.remedyId]);

  // Mock consultation data (this would come from a separate consultation hook in real implementation)
  const consultation: ConsultationSession | null = remedy ? {
    id: "consultation-1",
    startTime: new Date().toISOString(),
    endTime: new Date().toISOString(),
    diagnosis: "Based on remedy prescription",
    notes: "Devotee prescribed with remedy template",
    devotee: {
      id: "devotee-1",
      name: "Devotee Name",
      email: "devotee@example.com",
      phone: "+1234567890",
    },
  } : null;

  // Update editedRemedy when remedy data changes
  useEffect(() => {
    if (remedy) {
      setEditedRemedy({
        customInstructions: remedy.customInstructions || "",
        customDosage: remedy.customDosage || "",
        customDuration: remedy.customDuration || "",
      });
    }
  }, [remedy]);

  const handleSave = async () => {
    if (!remedy) return;

    try {
      // Create FormData for the server action
      const formData = new FormData();
      formData.append('templateId', remedy.template.id);
      formData.append('customInstructions', editedRemedy.customInstructions);
      formData.append('customDosage', editedRemedy.customDosage);
      formData.append('customDuration', editedRemedy.customDuration);

      const result = await updateRemedyTemplate(formData);

      if (result.success) {
        toast.success("Remedy updated successfully");
        setIsEditing(false);
        // The React Query cache will be invalidated automatically
      } else {
        throw new Error(result.error || 'Failed to update remedy');
      }
    } catch (error) {
      console.error('Failed to update remedy:', error);
      toast.error(error instanceof Error ? error.message : "Failed to update remedy");
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
          text: `Remedy prescribed for ${consultation?.devotee.name}`,
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
    if (!consultation?.devotee) return;

    switch (method) {
      case 'phone':
        if (consultation.devotee.phone) {
          window.open(`tel:${consultation.devotee.phone}`, '_blank');
        } else {
          toast.error("No phone number available");
        }
        break;
      case 'email':
        if (consultation.devotee.email) {
          window.open(`mailto:${consultation.devotee.email}`, '_blank');
        } else {
          toast.error("No email available");
        }
        break;
      case 'sms':
        if (consultation.devotee.phone) {
          window.open(`sms:${consultation.devotee.phone}`, '_blank');
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

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-red-600 mb-2">
            Error Loading Remedy
          </h3>
          <p className="text-muted-foreground mb-4">
            {error instanceof Error ? error.message : 'Failed to load remedy details'}
          </p>
          <Button onClick={() => router.back()} variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Go Back
          </Button>
        </div>
      </div>
    );
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
                {useTimeStore.getState().formatDate(remedy.createdAt)}
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
          <TabsTrigger value="devotee" className="text-xs sm:text-sm">Devotee Info</TabsTrigger>
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
                      {useTimeStore.getState().formatDate(remedy.createdAt)}
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

        {/* Devotee Tab */}
        <TabsContent value="devotee" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Devotee Information
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
                          {consultation.devotee.name || "Not provided"}
                        </p>
                      </div>
                    </div>
                    <div>
                      <Label>Devotee ID</Label>
                      <div className="mt-1 p-3 bg-muted rounded-md">
                        <p className="text-sm font-mono">
                          {consultation.devotee.id}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
                <div>
                  <h4 className="font-medium mb-3">Contact Methods</h4>
                  <div className="space-y-3">
                    {consultation.devotee.phone && (
                      <Button
                        variant="outline"
                        onClick={() => handleContact('phone')}
                        className="w-full justify-start"
                      >
                        <Phone className="h-4 w-4 mr-2" />
                        {consultation.devotee.phone}
                      </Button>
                    )}
                    {consultation.devotee.email && (
                      <Button
                        variant="outline"
                        onClick={() => handleContact('email')}
                        className="w-full justify-start"
                      >
                        <Mail className="h-4 w-4 mr-2" />
                        {consultation.devotee.email}
                      </Button>
                    )}
                    {consultation.devotee.phone && (
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
                          {useTimeStore.getState().formatDate(consultation.startTime)}
                        </p>
                      </div>
                    </div>
                    <div>
                      <Label>Time</Label>
                      <div className="mt-1 p-3 bg-muted rounded-md">
                        <p className="text-sm">
                          {useTimeStore.getState().formatTime(consultation.startTime)}
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
                            {useTimeStore.getState().formatDate(remedy.deliveredAt)}
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
                    disabled={!consultation.devotee.email}
                    className="flex-1 sm:flex-none"
                  >
                    <Mail className="h-4 w-4 mr-2" />
                    Resend Email
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => handleContact('sms')}
                    disabled={!consultation.devotee.phone}
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
