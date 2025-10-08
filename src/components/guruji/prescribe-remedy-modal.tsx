"use client";

import { useState } from "react";
import { useRemedyTemplates, usePrescribeRemedyDuringConsultation, useUserRemedyHistory } from "@/hooks/queries/use-remedies";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Loader2, Pill, CheckCircle, Calendar, History } from "lucide-react";
import { toast } from "sonner";

interface PrescribeRemedyModalProps {
  isOpen: boolean;
  onClose: () => void;
  consultationId: string;
  devoteeName: string;
  devoteeId: string;
  onSuccess?: () => void;
  onSkip?: () => void;
}

export function PrescribeRemedyModal({
  isOpen,
  onClose,
  consultationId,
  devoteeName,
  devoteeId,
  onSuccess,
  onSkip,
}: PrescribeRemedyModalProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Get remedy templates
  const { data: templatesData, isLoading: templatesLoading } = useRemedyTemplates({
    active: true,
    limit: 100,
  });

  // Get user's remedy history
  const { data: remedyHistoryData, isLoading: historyLoading, error: historyError } = useUserRemedyHistory(devoteeId, {
    limit: 5, // Show last 5 remedies
  });


  // Use the React Query hook for prescribing remedy
  const prescribeRemedyMutation = usePrescribeRemedyDuringConsultation();

  const templates = templatesData?.templates || [];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedTemplate) {
      toast.error("Please select a remedy template");
      return;
    }

    setIsSubmitting(true);
    const formData = new FormData();
    formData.append("consultationId", consultationId);
    formData.append("templateId", selectedTemplate);

    try {
      await prescribeRemedyMutation.mutateAsync(formData);

      // Success is handled by the mutation hook's onSuccess
      resetForm();
      onClose();
      // Trigger success callback to refresh data
      if (onSuccess) {
        onSuccess();
      }
    } catch {
      // Error is handled by the mutation hook's onError
      console.error("Failed to prescribe remedy");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSkip = () => {
    if (confirm('Are you sure you want to complete this consultation without prescribing a remedy?')) {
      resetForm();
      onClose();
      if (onSkip) {
        onSkip();
      }
    }
  };

  const resetForm = () => {
    setSelectedTemplate("");
  };

  const selectedTemplateData = templates.find(t => t.id === selectedTemplate);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pill className="h-5 w-5" />
            Prescribe Remedy - {devoteeName}
          </DialogTitle>
          <DialogDescription>
            Select a remedy template for this consultation. Previous remedies are shown for reference. You can also skip if no remedy is needed.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Previous Remedies History */}
          {remedyHistoryData && remedyHistoryData.remedies && remedyHistoryData.remedies.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <History className="h-4 w-4" />
                Previous Remedies for {devoteeName}
              </div>
              <div className="max-h-40 overflow-y-auto space-y-2 p-3 border rounded-lg bg-muted/20">
                {remedyHistoryData.remedies.map((remedy) => (
                  <div key={remedy.id} className="p-3 border rounded-md bg-background">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-sm">{remedy.template.name}</span>
                          <Badge variant="outline" className="text-xs">
                            {remedy.template.type}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mb-1">
                          {remedy.template.instructions}
                        </p>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {new Date(remedy.consultationSession.appointment.date).toLocaleDateString()}
                          </div>
                          <div className="flex items-center gap-1">
                            <span>By: {remedy.consultationSession.appointment.guruji?.name || 'Unknown'}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {historyLoading && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading remedy history...
            </div>
          )}

          {historyError && (
            <div className="p-3 border border-red-200 rounded-lg bg-red-50 text-red-700 text-sm">
              <strong>Error loading history:</strong> {historyError.message}
            </div>
          )}

          {!historyLoading && !historyError && remedyHistoryData && remedyHistoryData.remedies && remedyHistoryData.remedies.length === 0 && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <History className="h-4 w-4" />
              No previous remedies found for {devoteeName}
            </div>
          )}

          {/* Remedy Template Selection */}
          <div className="space-y-2">
            <Label htmlFor="template">Select Remedy Template *</Label>
            <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a remedy template..." />
              </SelectTrigger>
              <SelectContent>
                {templatesLoading ? (
                  <SelectItem value="loading" disabled>
                    <div className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Loading templates...
                    </div>
                  </SelectItem>
                ) : (
                  templates.map((template) => (
                    <SelectItem key={template.id} value={template.id}>
                      <div className="flex items-center gap-2">
                        <span>{template.name}</span>
                        <Badge variant="outline" className="text-xs">
                          {template.type}
                        </Badge>
                      </div>
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Selected Template Details */}
          {selectedTemplateData && (
            <div className="p-4 border rounded-lg bg-muted/50">
              <h4 className="font-semibold mb-2">{selectedTemplateData.name}</h4>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{selectedTemplateData.type}</Badge>
                  <Badge variant="secondary">{selectedTemplateData.category}</Badge>
                </div>
                {selectedTemplateData.description && (
                  <p className="text-muted-foreground">{selectedTemplateData.description}</p>
                )}
                <div>
                  <strong>Instructions:</strong> {selectedTemplateData.instructions}
                </div>
                {selectedTemplateData.dosage && (
                  <div><strong>Dosage:</strong> {selectedTemplateData.dosage}</div>
                )}
                {selectedTemplateData.duration && (
                  <div><strong>Duration:</strong> {selectedTemplateData.duration}</div>
                )}
              </div>
            </div>
          )}


          {/* Action Buttons */}
          <div className="flex justify-between pt-4">
            <Button 
              type="button" 
              variant="outline" 
              onClick={handleSkip}
              className="text-orange-600 border-orange-300 hover:bg-orange-50"
            >
              Skip & Complete
            </Button>
            <div className="flex gap-3">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={!selectedTemplate || isSubmitting}
                className="bg-green-600 hover:bg-green-700"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Prescribing...
                  </>
                ) : (
                  <>
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Prescribe Remedy
                  </>
                )}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
