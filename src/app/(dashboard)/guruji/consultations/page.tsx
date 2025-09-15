"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  UserCheck,
  Clock,
  User,
  Search,
  AlertTriangle,
  Pill,
  MessageSquare,
  Phone,
  Mail,
} from "lucide-react";
import { useGurujiConsultations } from "@/hooks/queries/use-guruji";
import { PrescribeRemedyModal } from "@/components/guruji/prescribe-remedy-modal";
import { RemedyDetailsModal } from "@/components/guruji/remedy-details-modal";
import { ContactHistoryModal } from "@/components/guruji/contact-history-modal";
import { ConsultationTimer } from "@/components/guruji/consultation-timer";
import { PageSpinner } from "@/components/loading";
import { useQueueUnified } from "@/hooks/use-queue-unified";
import type { QueueEntry } from "@/types/queue";
import React from "react";
import { RemedyType } from "@prisma/client";
import { showToast, commonToasts } from "@/lib/toast";
import { startConsultation, updateQueueStatus, getConsultationSessionId } from "@/lib/actions/queue-actions";

interface Patient {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
}

interface RemedyItem {
  id: string;
  template: {
    id: string;
    name: string;
    type: string;
    category: string;
    instructions: string;
    dosage?: string | null;
    duration?: string | null;
  };
  customInstructions?: string | null;
  customDosage?: string | null;
  customDuration?: string | null;
}

interface ConsultationSession {
  id: string;
  appointmentId: string;
  patientId: string;
  gurujiId: string;
  startTime: string;
  endTime?: string;
  duration?: number | null;
  symptoms?: string | null;
  diagnosis?: string | null;
  notes?: string | null;
  recordings?: unknown;
  createdAt: Date;
  updatedAt: Date;
  patient: Patient;
  appointment: {
    id: string;
    date: string;
    startTime: string;
    reason: string | null;
  };
  remedies?: RemedyItem[];
}


export default function GurujiConsultationsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [prescribeModalOpen, setPrescribeModalOpen] = useState(false);
  const [remedyDetailsModalOpen, setRemedyDetailsModalOpen] = useState(false);
  const [contactHistoryModalOpen, setContactHistoryModalOpen] = useState(false);

  const [selectedQueueEntry, setSelectedQueueEntry] = useState<QueueEntry | null>(null);
  const [selectedRemedy, setSelectedRemedy] = useState<{
    remedy: RemedyItem;
    consultation: ConsultationSession;
  } | null>(null);
  const [consultationSessionId, setConsultationSessionId] = useState<string | null>(null);
  
  // Use simple toast utility

  // Transform RemedyItem to match the modal's local RemedyDocument interface
  const transformRemedyForModal = (remedy: RemedyItem) => ({
    id: remedy.id,
    template: {
      id: remedy.template.id,
      name: remedy.template.name,
      type: remedy.template.type as RemedyType,
      category: remedy.template.category,
      instructions: remedy.template.instructions,
      dosage: remedy.template.dosage,
      duration: remedy.template.duration,
    },
    customInstructions: remedy.customInstructions,
    customDosage: remedy.customDosage,
    customDuration: remedy.customDuration,
    createdAt: new Date().toISOString(),
    pdfUrl: null,
    emailSent: false,
    smsSent: false,
  });
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);

  // Use React Query for data fetching
  const {
    data: consultations = [],
    isLoading: consultationsLoading,
    error: consultationsError,
  } = useGurujiConsultations();

  // Use the shared queue management hook
  const {
    queueEntries,
    loading: queueLoading,
    refetch: loadQueueEntries,
  } = useQueueUnified({
    role: 'guruji',
    autoRefresh: true,
    refreshInterval: 15000,
    enableRealtime: true,
  });

  // Queue action handlers
  const handleStartConsultation = async (entry: QueueEntry) => {
    try {
      const formData = new FormData();
      formData.append('queueEntryId', entry.id);
      
      const result = await startConsultation(formData);
      if (result.success) {
        commonToasts.consultationStarted(entry.user.name || 'Unknown User');
        // Store the consultation session ID for prescribing remedies
        if (result.consultationSessionId) {
          setConsultationSessionId(result.consultationSessionId);
        }
        await loadQueueEntries(); // Refresh the queue
      } else {
        showToast.error(result.error || 'Failed to start consultation');
      }
    } catch (error) {
      console.error('Error starting consultation:', error);
      showToast.error('Error starting consultation');
    }
  };

  const handleCompleteConsultation = async (entry: QueueEntry, onRemedyRequired?: (entry: QueueEntry) => void) => {
    try {
      const formData = new FormData();
      formData.append('queueEntryId', entry.id);
      formData.append('status', 'COMPLETED');
      
      const result = await updateQueueStatus(formData);
      if (result.success) {
        commonToasts.consultationCompleted(entry.user.name || 'Unknown User');
        setConsultationSessionId(null); // Clear consultation session ID
        await loadQueueEntries(); // Refresh the queue
      } else {
        // Check if the error is about missing remedy
        if (result.error?.includes('remedy') || result.requiresRemedy) {
          showToast.error(result.error || 'Please prescribe a remedy before completing');
          // Automatically open the prescribe remedy modal
          if (result.consultationSessionId) {
            setConsultationSessionId(result.consultationSessionId);
          }
          if (onRemedyRequired) {
            onRemedyRequired(entry);
          }
        } else {
          showToast.error(result.error || 'Failed to complete consultation');
        }
      }
    } catch (error) {
      console.error('Error completing consultation:', error);
      showToast.error('Error completing consultation');
    }
  };

  const handlePrescribeRemedy = async (entry: QueueEntry, onSuccess?: (consultationSessionId: string, entry: QueueEntry) => void) => {
    try {
      // Check if the entry is in progress
      if (entry.status !== 'IN_PROGRESS') {
        showToast.error('Can only prescribe remedies for consultations in progress.');
        return;
      }
      
      // Get the consultation session ID for this queue entry
      const result = await getConsultationSessionId(entry.id);
      if (!result.success) {
        showToast.error(result.error || 'Failed to get consultation session');
        return;
      }
      
      // Store the consultation session ID temporarily for the modal
      if (result.consultationSessionId && onSuccess) {
        onSuccess(result.consultationSessionId, entry);
      } else {
        showToast.error('Failed to get consultation session ID');
      }
    } catch (error) {
      console.error('Error preparing to prescribe remedy:', error);
      showToast.error('Error preparing to prescribe remedy');
    }
  };

  // Helper function to determine consultation status
  const getConsultationStatus = (consultation: ConsultationSession): string => {
    if (consultation.endTime) {
      return "COMPLETED";
    } else if (consultation.startTime) {
      return "IN_PROGRESS";
    } else {
      return "SCHEDULED";
    }
  };



  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "URGENT":
        return "bg-red-100 text-red-800";
      case "HIGH":
        return "bg-orange-100 text-orange-800";
      case "NORMAL":
        return "bg-blue-100 text-blue-800";
      case "LOW":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-blue-100 text-blue-800";
    }
  };

  // Custom handlers for consultation-specific functionality
  const onCompleteConsultation = async (entry: QueueEntry) => {
    // Check if remedy has been prescribed
    const hasRemedy = consultations.some(consultation => 
      consultation.patientId === entry.user.id && 
      consultation.endTime === null &&
      consultation.diagnosis && consultation.diagnosis.trim() !== ''
    );

    if (!hasRemedy) {
      // Use the shared handler which will handle the remedy requirement callback
      await handleCompleteConsultation(entry, (entry) => {
        setSelectedQueueEntry(entry);
        setPrescribeModalOpen(true);
      });
    } else {
      await handleCompleteConsultation(entry);
    }
  };

  const onPrescribeRemedy = async (entry: QueueEntry) => {
    await handlePrescribeRemedy(entry, (consultationSessionId, entry) => {
      setConsultationSessionId(consultationSessionId);
      setSelectedQueueEntry(entry);
      setPrescribeModalOpen(true);
    });
  };

  // Filter queue entries based on search and status
  const filteredQueueEntries = queueEntries.filter((entry) => {
    const matchesSearch = entry.user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         entry.user.phone?.includes(searchTerm) ||
                         entry.notes?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || entry.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  // Filter consultations based on search and status
  const filteredConsultations = consultations.filter((consultation) => {
    const status = getConsultationStatus(consultation);
    const matchesSearch = consultation.patient.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         consultation.patient.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         consultation.symptoms?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         consultation.diagnosis?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  if (queueLoading || consultationsLoading) {
    return <PageSpinner message="Loading consultations..." />;
  }

  if (consultationsError) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Consultations</h1>
            <p className="text-muted-foreground mt-2">
              Manage patient consultations and prescribe remedies
            </p>
          </div>
        </div>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-red-600 mb-2">
                Error Loading Consultations
              </h3>
              <p className="text-muted-foreground mb-4">
                Failed to load consultation data. Please try refreshing the page.
              </p>
              <Button onClick={() => window.location.reload()}>
                <Clock className="h-4 w-4 mr-2" />
                Refresh Page
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Consultations</h1>
          <p className="text-muted-foreground mt-2 text-sm sm:text-base">
            Manage patient consultations and prescribe remedies
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={() => loadQueueEntries()} className="flex-1 sm:flex-none">
            <Clock className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
          <CardDescription>Search and filter consultations</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by patient name, email, symptoms, or diagnosis..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="WAITING">Waiting</SelectItem>
                <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                <SelectItem value="COMPLETED">Completed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Checked-in Patients Ready for Consultation */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserCheck className="h-5 w-5" />
            Checked-in Patients Ready for Consultation
          </CardTitle>
          <CardDescription>
            Patients who have checked in and are waiting for consultation
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredQueueEntries.filter(entry => entry.status === 'WAITING').length === 0 ? (
            <div className="text-center py-8">
              <UserCheck className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Patients Waiting</h3>
              <p className="text-muted-foreground">
                No patients are currently checked in and waiting for consultation.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredQueueEntries
                .filter(entry => entry.status === 'WAITING')
                .map((entry) => (
                  <div
                    key={entry.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50"
                  >
                    <div className="flex items-center space-x-4">
                      <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                        <User className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <h3 className="font-semibold">{entry.user.name || 'Unknown User'}</h3>
                          <Badge className={getPriorityColor(entry.priority || 'NORMAL')}>
                            {entry.priority || 'NORMAL'}
                          </Badge>
                          <Badge variant="outline">#{entry.position} in queue</Badge>
                        </div>
                        <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                          <span className="flex items-center">
                            <Phone className="mr-1 h-3 w-3" />
                            {entry.user.phone || 'No phone'}
                          </span>
                          <span className="flex items-center">
                            <Clock className="mr-1 h-3 w-3" />
                            Checked in: {new Date(entry.checkedInAt).toLocaleTimeString()}
                          </span>
                          {entry.estimatedWait && (
                            <span className="flex items-center">
                              <Clock className="mr-1 h-3 w-3" />
                              Est. wait: {entry.estimatedWait}m
                            </span>
                          )}
                        </div>
                        {/* Enhanced contact display */}
                        <div className="mt-2 p-2 bg-blue-50 rounded border-l-4 border-blue-200">
                          <div className="text-xs font-medium text-blue-800 mb-1">Contact Information</div>
                          <div className="text-xs text-blue-700">
                            {entry.user.phone ? (
                              <span className="flex items-center">
                                <Phone className="mr-1 h-3 w-3" />
                                {entry.user.phone}
                              </span>
                            ) : (
                              <span className="text-red-600">No phone number available</span>
                            )}
                          </div>
                        </div>
                        {entry.notes && (
                          <p className="text-sm text-muted-foreground mt-1">
                            <strong>Reason:</strong> {entry.notes}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => {
                          if (entry.user.phone) {
                            window.open(`tel:${entry.user.phone}`, '_blank');
                          } else {
                            commonToasts.noPhoneNumber();
                          }
                        }}
                        className="flex-1 sm:flex-none"
                      >
                        <MessageSquare className="h-3 w-3 mr-1" />
                        Contact
                      </Button>
                      <Button 
                        size="sm" 
                        onClick={() => handleStartConsultation(entry)}
                        className="flex-1 sm:flex-none"
                      >
                        Start Consultation
                      </Button>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Active Consultations */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Active Consultations
          </CardTitle>
          <CardDescription>
            Patients currently being consulted
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredQueueEntries.filter(entry => entry.status === 'IN_PROGRESS').length === 0 ? (
            <div className="text-center py-8">
              <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Active Consultations</h3>
              <p className="text-muted-foreground">
                No patients are currently being consulted.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {filteredQueueEntries
                .filter(entry => entry.status === 'IN_PROGRESS')
                .map((entry) => {
                  // Find matching consultation session for this entry
                  const activeConsultation = filteredConsultations.find(consultation => 
                    consultation.patientId === entry.user.id && 
                    !consultation.endTime
                  );

                  return (
                    <div key={entry.id} className="space-y-4">
                      {/* Real-time Timer */}
                      {activeConsultation && (
                        <div className="flex justify-center">
                          <ConsultationTimer
                            consultation={{
                              id: activeConsultation.id,
                              appointmentId: activeConsultation.appointmentId,
                              patientId: activeConsultation.patientId,
                              gurujiId: activeConsultation.gurujiId,
                              startTime: activeConsultation.startTime,
                              endTime: activeConsultation.endTime,
                              duration: activeConsultation.duration || undefined,
                              patient: {
                                id: activeConsultation.patient.id,
                                name: activeConsultation.patient.name,
                                phone: activeConsultation.patient.phone
                              }
                            }}
                            onUpdate={() => {
                              // Refresh data when consultation is updated
                              loadQueueEntries();
                            }}
                          />
                        </div>
                      )}
                      
                      {/* Patient Info and Controls */}
                      <div className="flex items-center justify-between p-4 border rounded-lg bg-blue-50 border-blue-200">
                        <div className="flex items-center space-x-4">
                          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                            <User className="h-5 w-5 text-blue-600" />
                          </div>
                          <div>
                            <div className="flex items-center space-x-2">
                              <h3 className="font-semibold">{entry.user.name || 'Unknown User'}</h3>
                              <Badge className="bg-blue-100 text-blue-800">IN PROGRESS</Badge>
                            </div>
                            <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                              <span className="flex items-center">
                                <Phone className="mr-1 h-3 w-3" />
                                {entry.user.phone || 'No phone'}
                              </span>
                              <span className="flex items-center">
                                <Clock className="mr-1 h-3 w-3" />
                                Started: {new Date(entry.checkedInAt).toLocaleTimeString()}
                              </span>
                            </div>
                            {/* Enhanced contact display */}
                            <div className="mt-2 p-2 bg-green-50 rounded border-l-4 border-green-200">
                              <div className="text-xs font-medium text-green-800 mb-1">Contact Information</div>
                              <div className="text-xs text-green-700">
                                {entry.user.phone ? (
                                  <span className="flex items-center">
                                    <Phone className="mr-1 h-3 w-3" />
                                    {entry.user.phone}
                                  </span>
                                ) : (
                                  <span className="text-red-600">No phone number available</span>
                                )}
                              </div>
                            </div>
                            {entry.notes && (
                              <p className="text-sm text-muted-foreground mt-1">
                                <strong>Reason:</strong> {entry.notes}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-col sm:flex-row gap-2">
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => {
                              if (entry.user.phone) {
                                window.open(`tel:${entry.user.phone}`, '_blank');
                              } else {
                                commonToasts.noPhoneNumber();
                              }
                            }}
                            className="flex-1 sm:flex-none"
                          >
                            <MessageSquare className="h-3 w-3 mr-1" />
                            Contact
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => onPrescribeRemedy(entry)}
                            className="flex-1 sm:flex-none"
                          >
                            <Pill className="h-3 w-3 mr-1" />
                            Prescribe Remedy
                          </Button>
                          <Button 
                            size="sm" 
                            variant="secondary"
                            onClick={() => onCompleteConsultation(entry)}
                            className="flex-1 sm:flex-none"
                          >
                            Complete Consultation
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Past Consultations */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserCheck className="h-5 w-5" />
            Past Consultations
          </CardTitle>
          <CardDescription>
            Completed consultation sessions
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredConsultations.filter(consultation => getConsultationStatus(consultation) === 'COMPLETED').length === 0 ? (
            <div className="text-center py-8">
              <UserCheck className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Past Consultations</h3>
              <p className="text-muted-foreground">
                No completed consultations found.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredConsultations
                .filter(consultation => getConsultationStatus(consultation) === 'COMPLETED')
                .slice(0, 10) // Show only recent 10
                .map((consultation) => (
                  <div
                    key={consultation.id}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div className="flex items-center space-x-4">
                      <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                        <User className="h-5 w-5 text-green-600" />
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <h3 className="font-semibold">{consultation.patient.name || 'Unknown User'}</h3>
                          <Badge className="bg-green-100 text-green-800">COMPLETED</Badge>
                          {consultation.remedies && consultation.remedies.length > 0 && (
                            <Badge className="bg-blue-100 text-blue-800 flex items-center gap-1">
                              <Pill className="h-3 w-3" />
                              {consultation.remedies.length} Remedy{consultation.remedies.length > 1 ? 'ies' : ''}
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                          <span className="flex items-center">
                            <Phone className="mr-1 h-3 w-3" />
                            {consultation.patient.phone || 'No phone'}
                          </span>
                          <span className="flex items-center">
                            <Clock className="mr-1 h-3 w-3" />
                            {new Date(consultation.startTime).toLocaleDateString()}
                          </span>
                          {consultation.duration && (
                            <span className="flex items-center">
                              <Clock className="mr-1 h-3 w-3" />
                              Duration: {consultation.duration}m
                            </span>
                          )}
                        </div>
                        {/* Enhanced contact display */}
                        <div className="mt-2 p-2 bg-gray-50 rounded border-l-4 border-gray-200">
                          <div className="text-xs font-medium text-gray-800 mb-1">Contact Information</div>
                          <div className="text-xs text-gray-700 space-y-1">
                            {consultation.patient.phone && (
                              <span className="flex items-center">
                                <Phone className="mr-1 h-3 w-3" />
                                {consultation.patient.phone}
                              </span>
                            )}
                            {consultation.patient.email && (
                              <span className="flex items-center">
                                <Mail className="mr-1 h-3 w-3" />
                                {consultation.patient.email}
                              </span>
                            )}
                            {!consultation.patient.phone && !consultation.patient.email && (
                              <span className="text-red-600">No contact information available</span>
                            )}
                          </div>
                        </div>
                        {consultation.diagnosis && (
                          <p className="text-sm text-muted-foreground mt-1">
                            <strong>Diagnosis:</strong> {consultation.diagnosis}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => {
                          if (consultation.remedies && consultation.remedies.length > 0) {
                            const remedy = consultation.remedies[0]; // Show first remedy
                            setSelectedRemedy({ remedy, consultation });
                            setRemedyDetailsModalOpen(true);
                          } else {
                            showToast.info(`No remedies prescribed for ${consultation.patient.name || 'Unknown'} yet`);
                          }
                        }}
                        className="flex-1 sm:flex-none"
                      >
                        <Pill className="h-3 w-3 mr-1" />
                        {consultation.remedies && consultation.remedies.length > 0 ? 'View Remedy' : 'No Remedy'}
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => {
                          setSelectedPatient(consultation.patient);
                          setContactHistoryModalOpen(true);
                        }}
                        className="flex-1 sm:flex-none"
                      >
                        <MessageSquare className="h-3 w-3 mr-1" />
                        Contact
                      </Button>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Prescribe Remedy Modal */}
      {selectedQueueEntry && consultationSessionId && (
        <PrescribeRemedyModal
          isOpen={prescribeModalOpen}
          onClose={() => {
            setPrescribeModalOpen(false);
            setSelectedQueueEntry(null);
          }}
          consultationId={consultationSessionId}
          patientName={selectedQueueEntry.user.name || 'Unknown User'}
        />
      )}

      {/* Remedy Details Modal */}
      {selectedRemedy && (
        <RemedyDetailsModal
          isOpen={remedyDetailsModalOpen}
          onClose={() => {
            setRemedyDetailsModalOpen(false);
            setSelectedRemedy(null);
          }}
          remedy={transformRemedyForModal(selectedRemedy.remedy)}
          consultation={selectedRemedy.consultation}
        />
      )}

      {/* Contact History Modal */}
      {selectedPatient && (
        <ContactHistoryModal
          isOpen={contactHistoryModalOpen}
          onClose={() => {
            setContactHistoryModalOpen(false);
            setSelectedPatient(null);
          }}
          patient={selectedPatient}
        />
      )}
    </div>
  );
}
