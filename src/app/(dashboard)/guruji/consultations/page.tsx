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
} from "lucide-react";
import { useGurujiConsultations } from "@/hooks/queries/use-guruji";
import { PrescribeRemedyModal } from "@/components/guruji/prescribe-remedy-modal";
import { getGurujiQueueEntries, startConsultation, updateQueueStatus } from "@/lib/actions/queue-actions";
import { toast } from "sonner";
import { PageSpinner } from "@/components/ui/global-spinner";
import React from "react";

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
  patient: {
    id: string;
    name: string | null;
    email: string | null;
    phone: string | null;
  };
  appointment: {
    id: string;
    date: string;
    startTime: string;
    reason: string | null;
  };
}

interface QueueEntry {
  id: string;
  position: number;
  status: string;
  estimatedWait?: number;
  priority?: string;
  checkedInAt: string;
  notes?: string;
  user: {
    id: string;
    name: string | null;
    phone: string | null;
    dateOfBirth?: string | null; // Transformed to string
  };
}

interface QueueEntryFromDB {
  id: string;
  position: number;
  status: string;
  estimatedWait: number | null;
  priority: string | null;
  checkedInAt: Date | string; // Can be Date or string from server
  notes: string | null;
  user: {
    id: string;
    name: string | null;
    phone: string | null;
    dateOfBirth: Date | string | null; // Can be Date or string from server
  };
}

export default function GurujiConsultationsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [prescribeModalOpen, setPrescribeModalOpen] = useState(false);

  const [selectedQueueEntry, setSelectedQueueEntry] = useState<QueueEntry | null>(null);
  const [queueEntries, setQueueEntries] = useState<QueueEntry[]>([]);
  const [loading, setLoading] = useState(true);

  // Use React Query for data fetching
  const {
    data: consultations = [],
    isLoading: consultationsLoading,
    error: consultationsError,
  } = useGurujiConsultations();

  // Load queue entries for checked-in patients
  const loadQueueEntries = async () => {
    try {
      setLoading(true);
      const result = await getGurujiQueueEntries();
      
      if (result.success && result.queueEntries) {
        const entries = result.queueEntries;
        const transformedQueue = entries.map((entry: QueueEntryFromDB, index: number) => ({
          id: entry.id,
          position: entry.position,
          status: entry.status,
          estimatedWait: entry.status === 'WAITING' ? (index + 1) * 15 : (entry.estimatedWait || undefined),
          priority: entry.priority || undefined,
          checkedInAt: entry.checkedInAt instanceof Date ? entry.checkedInAt.toISOString() : entry.checkedInAt,
          notes: entry.notes || undefined,
          user: {
            id: entry.user.id,
            name: entry.user.name,
            phone: entry.user.phone,
            dateOfBirth: entry.user.dateOfBirth instanceof Date ? entry.user.dateOfBirth.toISOString() : entry.user.dateOfBirth,
          },
        }));
        setQueueEntries(transformedQueue);
      } else {
        console.error('Failed to load queue entries:', result.error);
        toast.error('Failed to load queue data');
      }
    } catch (error) {
      console.error('Error loading queue entries:', error);
      toast.error('Error loading queue data');
    } finally {
      setLoading(false);
    }
  };

  // Load queue entries on component mount
  React.useEffect(() => {
    loadQueueEntries();
  }, []);

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

  const handleStartConsultation = async (entry: QueueEntry) => {
    try {
      const formData = new FormData();
      formData.append('queueEntryId', entry.id);
      
      const result = await startConsultation(formData);
      if (result.success) {
        toast.success(`Started consultation with ${entry.user.name}`);
        await loadQueueEntries(); // Refresh the queue
      } else {
        toast.error(result.error || 'Failed to start consultation');
      }
    } catch (error) {
      console.error('Error starting consultation:', error);
      toast.error('Error starting consultation');
    }
  };

  const handleCompleteConsultation = async (entry: QueueEntry) => {
    // Check if remedy has been prescribed
    const hasRemedy = consultations.some(consultation => 
      consultation.patientId === entry.user.id && 
      consultation.endTime === null &&
      consultation.diagnosis && consultation.diagnosis.trim() !== ''
    );

    if (!hasRemedy) {
      toast.error('Remedy must be prescribed before completing consultation');
      // Open prescribe remedy modal
      setSelectedQueueEntry(entry);
      setPrescribeModalOpen(true);
      return;
    }

    try {
      const formData = new FormData();
      formData.append('queueEntryId', entry.id);
      formData.append('status', 'COMPLETED');
      
      const result = await updateQueueStatus(formData);
      if (result.success) {
        toast.success(`Completed consultation with ${entry.user.name}`);
        await loadQueueEntries(); // Refresh the queue
      } else {
        toast.error(result.error || 'Failed to complete consultation');
      }
    } catch (error) {
      console.error('Error completing consultation:', error);
      toast.error('Error completing consultation');
    }
  };

  const handlePrescribeRemedy = (entry: QueueEntry) => {
    setSelectedQueueEntry(entry);
    setPrescribeModalOpen(true);
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

  if (loading || consultationsLoading) {
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Consultations</h1>
          <p className="text-muted-foreground mt-2">
            Manage patient consultations and prescribe remedies
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={loadQueueEntries}>
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
          <div className="flex gap-4">
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
              <SelectTrigger className="w-48">
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
                        {entry.notes && (
                          <p className="text-sm text-muted-foreground mt-1">
                            <strong>Reason:</strong> {entry.notes}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <Button size="sm" variant="outline">
                        <MessageSquare className="h-3 w-3 mr-1" />
                        Contact
                      </Button>
                      <Button 
                        size="sm" 
                        onClick={() => handleStartConsultation(entry)}
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
            <div className="space-y-4">
              {filteredQueueEntries
                .filter(entry => entry.status === 'IN_PROGRESS')
                .map((entry) => (
                  <div
                    key={entry.id}
                    className="flex items-center justify-between p-4 border rounded-lg bg-blue-50 border-blue-200"
                  >
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
                        {entry.notes && (
                          <p className="text-sm text-muted-foreground mt-1">
                            <strong>Reason:</strong> {entry.notes}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => handlePrescribeRemedy(entry)}
                      >
                        <Pill className="h-3 w-3 mr-1" />
                        Prescribe Remedy
                      </Button>
                      <Button 
                        size="sm" 
                        variant="secondary"
                        onClick={() => handleCompleteConsultation(entry)}
                      >
                        Complete Consultation
                      </Button>
                    </div>
                  </div>
                ))}
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
                        {consultation.diagnosis && (
                          <p className="text-sm text-muted-foreground mt-1">
                            <strong>Diagnosis:</strong> {consultation.diagnosis}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <Button size="sm" variant="outline">
                        <Pill className="h-3 w-3 mr-1" />
                        View Remedy
                      </Button>
                      <Button size="sm" variant="outline">
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
      {selectedQueueEntry && (
        <PrescribeRemedyModal
          isOpen={prescribeModalOpen}
          onClose={() => {
            setPrescribeModalOpen(false);
            setSelectedQueueEntry(null);
          }}
          consultationId={selectedQueueEntry.id}
          patientName={selectedQueueEntry.user.name || 'Unknown User'}
        />
      )}
    </div>
  );
}
