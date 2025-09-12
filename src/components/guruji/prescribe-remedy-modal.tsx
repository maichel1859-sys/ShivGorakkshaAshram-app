"use client";

import { useState } from "react";
import { prescribeRemedyDuringConsultation } from "@/lib/actions/remedy-actions";
import { useRemedyTemplates } from "@/hooks/queries/use-remedies";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
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
import { Badge } from "@/components/ui/badge";
import { Loader2, Pill, CheckCircle } from "lucide-react";
import { toast } from "sonner";

interface PrescribeRemedyModalProps {
  isOpen: boolean;
  onClose: () => void;
  consultationId: string;
  patientName: string;
  onSuccess?: () => void;
  onSkip?: () => void;
}

export function PrescribeRemedyModal({
  isOpen,
  onClose,
  consultationId,
  patientName,
  onSuccess,
  onSkip,
}: PrescribeRemedyModalProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");
  const [customInstructions, setCustomInstructions] = useState("");
  const [customDosage, setCustomDosage] = useState("");
  const [customDuration, setCustomDuration] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Get remedy templates
  const { data: templatesData, isLoading: templatesLoading } = useRemedyTemplates({
    active: true,
    limit: 100,
  });

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
    formData.append("customInstructions", customInstructions);
    formData.append("customDosage", customDosage);
    formData.append("customDuration", customDuration);

    try {
      const result = await prescribeRemedyDuringConsultation(formData);
      
      if (result.success) {
        toast.success(result.message || "Remedy prescribed successfully!");
        resetForm();
        onClose();
        // Trigger success callback to refresh data
        if (onSuccess) {
          onSuccess();
        }
      } else {
        toast.error(result.error || "Failed to prescribe remedy");
      }
    } catch {
      toast.error("An error occurred while prescribing the remedy");
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
    setCustomInstructions("");
    setCustomDosage("");
    setCustomDuration("");
  };

  const selectedTemplateData = templates.find(t => t.id === selectedTemplate);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pill className="h-5 w-5" />
            Prescribe Remedy - {patientName}
          </DialogTitle>
          <DialogDescription>
            Select a remedy template and customize dosage for this consultation. You can also skip if no remedy is needed.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
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

          {/* Custom Instructions */}
          <div className="space-y-2">
            <Label htmlFor="customInstructions">
              Custom Instructions (Optional)
            </Label>
            <Textarea
              id="customInstructions"
              placeholder="Add any custom instructions or modifications..."
              value={customInstructions}
              onChange={(e) => setCustomInstructions(e.target.value)}
              rows={3}
            />
          </div>

          {/* Custom Dosage */}
          <div className="space-y-2">
            <Label htmlFor="customDosage">
              Custom Dosage (Optional)
            </Label>
            <Input
              id="customDosage"
              placeholder="e.g., 2 tablets twice daily"
              value={customDosage}
              onChange={(e) => setCustomDosage(e.target.value)}
            />
          </div>

          {/* Custom Duration */}
          <div className="space-y-2">
            <Label htmlFor="customDuration">
              Custom Duration (Optional)
            </Label>
            <Input
              id="customDuration"
              placeholder="e.g., 7 days"
              value={customDuration}
              onChange={(e) => setCustomDuration(e.target.value)}
            />
          </div>

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
