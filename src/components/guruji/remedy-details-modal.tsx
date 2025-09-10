"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Pill,
  User,
  Calendar,
  Edit,
  Download,
  Share2,
  MessageSquare,
  Mail,
  Phone,
} from "lucide-react";
import { toast } from "sonner";
import { updateRemedy, resendRemedy } from "@/lib/actions/remedy-management-actions";

interface RemedyTemplate {
  id: string;
  name: string;
  type: string;
  category: string;
  instructions: string;
  dosage?: string | null;
  duration?: string | null;
}

interface RemedyDocument {
  id: string;
  template: RemedyTemplate;
  customInstructions?: string | null;
  customDosage?: string | null;
  customDuration?: string | null;
  createdAt: string;
  pdfUrl?: string | null;
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

interface RemedyDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  remedy: RemedyDocument;
  consultation: ConsultationSession;
}

export function RemedyDetailsModal({
  isOpen,
  onClose,
  remedy,
  consultation,
}: RemedyDetailsModalProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedRemedy, setEditedRemedy] = useState({
    customInstructions: remedy.customInstructions || "",
    customDosage: remedy.customDosage || "",
    customDuration: remedy.customDuration || "",
  });

  const handleSave = async () => {
    try {
      const formData = new FormData();
      if (editedRemedy.customInstructions) {
        formData.append('customInstructions', editedRemedy.customInstructions);
      }
      if (editedRemedy.customDosage) {
        formData.append('customDosage', editedRemedy.customDosage);
      }
      if (editedRemedy.customDuration) {
        formData.append('customDuration', editedRemedy.customDuration);
      }

      const result = await updateRemedy(remedy.id, formData);
      
      if (result.success && result.remedy) {
        toast.success("Remedy updated successfully");
        setIsEditing(false);
        // Update local state
        setEditedRemedy({
          customInstructions: result.remedy.customInstructions || "",
          customDosage: result.remedy.customDosage || "",
          customDuration: result.remedy.customDuration || "",
        });
      } else {
        toast.error(result.error || "Failed to update remedy");
      }
    } catch (error) {
      console.error('Update error:', error);
      toast.error("Failed to update remedy");
    }
  };

  const handleDownloadPDF = () => {
    if (remedy.pdfUrl) {
      window.open(remedy.pdfUrl, '_blank');
    } else {
      toast.info("PDF generation coming soon");
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Remedy: ${remedy.template.name}`,
          text: `Remedy prescribed for ${consultation.patient.name}`,
          url: window.location.href,
        });
      } catch (error) {
        console.log('Error sharing:', error);
      }
    } else {
      // Fallback for browsers that don't support Web Share API
      navigator.clipboard.writeText(window.location.href);
      toast.success("Link copied to clipboard");
    }
  };

  const handleResendRemedy = async () => {
    try {
      const result = await resendRemedy(remedy.id);
      
      if (result.success) {
        toast.success(result.message || "Remedy resent successfully");
      } else {
        toast.error(result.error || "Failed to resend remedy");
      }
    } catch (error) {
      console.error('Resend error:', error);
      toast.error("Failed to resend remedy");
    }
  };

  const handleContact = (method: 'phone' | 'email' | 'sms') => {
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

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto sm:max-w-[95vw] sm:max-h-[95vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pill className="h-5 w-5" />
            Remedy Details
          </DialogTitle>
          <DialogDescription>
            Complete information about the prescribed remedy for {consultation.patient.name}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Header Actions */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-2">
              <Badge className={getTypeColor(remedy.template.type)}>
                {remedy.template.type}
              </Badge>
              <Badge variant="outline">{remedy.template.category}</Badge>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsEditing(!isEditing)}
                className="flex-1 sm:flex-none"
              >
                <Edit className="h-4 w-4 mr-2" />
                {isEditing ? 'Cancel' : 'Edit'}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleResendRemedy}
                className="flex-1 sm:flex-none"
              >
                <MessageSquare className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">Resend</span>
                <span className="sm:hidden">Resend</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownloadPDF}
                className="flex-1 sm:flex-none"
              >
                <Download className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">Download PDF</span>
                <span className="sm:hidden">PDF</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleShare}
                className="flex-1 sm:flex-none"
              >
                <Share2 className="h-4 w-4 mr-2" />
                Share
              </Button>
            </div>
          </div>

          <Tabs defaultValue="details" className="w-full">
            <TabsList className="grid w-full grid-cols-1 sm:grid-cols-3 gap-1">
              <TabsTrigger value="details" className="text-xs sm:text-sm">Details</TabsTrigger>
              <TabsTrigger value="patient" className="text-xs sm:text-sm">Patient</TabsTrigger>
              <TabsTrigger value="consultation" className="text-xs sm:text-sm">Consultation</TabsTrigger>
            </TabsList>

            {/* Remedy Details Tab */}
            <TabsContent value="details" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Pill className="h-5 w-5" />
                    {remedy.template.name}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 gap-4">
                    <div>
                      <h4 className="font-medium mb-2">Template Instructions</h4>
                      <p className="text-sm text-muted-foreground">
                        {remedy.template.instructions}
                      </p>
                    </div>
                    <div>
                      <h4 className="font-medium mb-2">Custom Instructions</h4>
                      {isEditing ? (
                        <textarea
                          className="w-full p-2 border rounded-md"
                          value={editedRemedy.customInstructions}
                          onChange={(e) => setEditedRemedy(prev => ({
                            ...prev,
                            customInstructions: e.target.value
                          }))}
                          rows={3}
                        />
                      ) : (
                        <p className="text-sm text-muted-foreground">
                          {remedy.customInstructions || "No custom instructions"}
                        </p>
                      )}
                    </div>
                  </div>

                  <Separator />

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div>
                      <h4 className="font-medium mb-2">Dosage</h4>
                      {isEditing ? (
                        <input
                          type="text"
                          className="w-full p-2 border rounded-md"
                          value={editedRemedy.customDosage}
                          onChange={(e) => setEditedRemedy(prev => ({
                            ...prev,
                            customDosage: e.target.value
                          }))}
                          placeholder={remedy.template.dosage || "Enter dosage"}
                        />
                      ) : (
                        <p className="text-sm text-muted-foreground">
                          {remedy.customDosage || remedy.template.dosage || "Not specified"}
                        </p>
                      )}
                    </div>
                    <div>
                      <h4 className="font-medium mb-2">Duration</h4>
                      {isEditing ? (
                        <input
                          type="text"
                          className="w-full p-2 border rounded-md"
                          value={editedRemedy.customDuration}
                          onChange={(e) => setEditedRemedy(prev => ({
                            ...prev,
                            customDuration: e.target.value
                          }))}
                          placeholder={remedy.template.duration || "Enter duration"}
                        />
                      ) : (
                        <p className="text-sm text-muted-foreground">
                          {remedy.customDuration || remedy.template.duration || "Not specified"}
                        </p>
                      )}
                    </div>
                    <div>
                      <h4 className="font-medium mb-2">Prescribed On</h4>
                      <p className="text-sm text-muted-foreground">
                        {new Date(remedy.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  {isEditing && (
                    <div className="flex flex-col sm:flex-row gap-2 pt-4">
                      <Button onClick={handleSave} className="flex-1 sm:flex-none">
                        Save Changes
                      </Button>
                      <Button variant="outline" onClick={() => setIsEditing(false)} className="flex-1 sm:flex-none">
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
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h4 className="font-medium mb-2">Name</h4>
                      <p className="text-sm text-muted-foreground">
                        {consultation.patient.name || "Not provided"}
                      </p>
                    </div>
                    <div>
                      <h4 className="font-medium mb-2">Contact Methods</h4>
                      <div className="space-y-2">
                        {consultation.patient.phone && (
                          <Button
                            variant="outline"
                            size="sm"
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
                            size="sm"
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
                            size="sm"
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
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h4 className="font-medium mb-2">Date</h4>
                      <p className="text-sm text-muted-foreground">
                        {new Date(consultation.startTime).toLocaleDateString()}
                      </p>
                    </div>
                    <div>
                      <h4 className="font-medium mb-2">Time</h4>
                      <p className="text-sm text-muted-foreground">
                        {new Date(consultation.startTime).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                  
                  {consultation.diagnosis && (
                    <div>
                      <h4 className="font-medium mb-2">Diagnosis</h4>
                      <p className="text-sm text-muted-foreground">
                        {consultation.diagnosis}
                      </p>
                    </div>
                  )}
                  
                  {consultation.notes && (
                    <div>
                      <h4 className="font-medium mb-2">Notes</h4>
                      <p className="text-sm text-muted-foreground">
                        {consultation.notes}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}
