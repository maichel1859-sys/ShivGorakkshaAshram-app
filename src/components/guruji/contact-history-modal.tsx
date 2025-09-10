"use client";

import { useState, useEffect, useCallback } from "react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  MessageSquare,
  Mail,
  Phone,
  Send,
  Clock,
  User,
  CheckCircle,
  XCircle,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";

interface ContactHistory {
  id: string;
  type: 'email' | 'sms' | 'phone';
  method: string;
  recipient: string;
  subject?: string;
  message: string;
  status: 'sent' | 'delivered' | 'failed' | 'pending';
  sentAt: string;
  deliveredAt?: string;
  errorMessage?: string;
}

interface Patient {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
}

interface ContactHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  patient: Patient;
}

export function ContactHistoryModal({
  isOpen,
  onClose,
  patient,
}: ContactHistoryModalProps) {
  const [activeTab, setActiveTab] = useState<'history' | 'new'>('history');
  const [contactHistory, setContactHistory] = useState<ContactHistory[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [newMessage, setNewMessage] = useState({
    type: 'sms' as 'email' | 'sms',
    subject: '',
    message: '',
  });

  const fetchContactHistory = useCallback(async () => {
    try {
      setIsLoading(true);
      // TODO: Replace with actual API call
      // const response = await fetch(`/api/patients/${patient.id}/contact-history`);
      // const data = await response.json();
      
      // Mock data for now
      const mockHistory: ContactHistory[] = [
        {
          id: '1',
          type: 'email',
          method: 'Email',
          recipient: patient.email || 'No email',
          subject: 'Remedy Prescription Update',
          message: 'Your remedy prescription has been updated with new instructions.',
          status: 'delivered',
          sentAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
          deliveredAt: new Date(Date.now() - 24 * 60 * 60 * 1000 + 5 * 60 * 1000).toISOString(),
        },
        {
          id: '2',
          type: 'sms',
          method: 'SMS',
          recipient: patient.phone || 'No phone',
          message: 'Remedy: Take 2 teaspoons daily. Follow up in 2 weeks.',
          status: 'sent',
          sentAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        },
        {
          id: '3',
          type: 'phone',
          method: 'Phone Call',
          recipient: patient.phone || 'No phone',
          message: 'Called to discuss remedy side effects',
          status: 'delivered',
          sentAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
          deliveredAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000 + 2 * 60 * 1000).toISOString(),
        },
      ];
      
      setContactHistory(mockHistory);
    } catch (error) {
      console.error('Failed to fetch contact history:', error);
      toast.error('Failed to load contact history');
    } finally {
      setIsLoading(false);
    }
  }, [patient.email, patient.phone]);

  useEffect(() => {
    if (isOpen) {
      fetchContactHistory();
    }
  }, [isOpen, fetchContactHistory]);

  const handleSendMessage = async () => {
    if (!newMessage.message.trim()) {
      toast.error('Please enter a message');
      return;
    }

    try {
      setIsLoading(true);
      
      // For now, we'll use a mock API call since we don't have a direct contact API
      // TODO: Create a dedicated contact API endpoint
      const mockResponse = await new Promise<{ success: boolean }>(resolve => 
        setTimeout(() => resolve({ success: true }), 1000)
      );

      if (mockResponse.success) {
        const newContact: ContactHistory = {
          id: Date.now().toString(),
          type: newMessage.type,
          method: newMessage.type === 'email' ? 'Email' : 'SMS',
          recipient: newMessage.type === 'email' ? patient.email || 'No email' : patient.phone || 'No phone',
          subject: newMessage.subject,
          message: newMessage.message,
          status: 'pending',
          sentAt: new Date().toISOString(),
        };

        setContactHistory(prev => [newContact, ...prev]);
        setNewMessage({ type: 'sms', subject: '', message: '' });
        setActiveTab('history');
        
        toast.success('Message sent successfully');
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      toast.error('Failed to send message');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async (contactId: string) => {
    try {
      const contact = contactHistory.find(c => c.id === contactId);
      if (!contact) return;

      // TODO: Implement resend functionality
      toast.success('Message resent successfully');
    } catch {
      toast.error('Failed to resend message');
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'delivered':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'sent':
        return <Clock className="h-4 w-4 text-blue-500" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'pending':
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'delivered':
        return 'bg-green-100 text-green-800';
      case 'sent':
        return 'bg-blue-100 text-blue-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getMethodIcon = (type: string) => {
    switch (type) {
      case 'email':
        return <Mail className="h-4 w-4" />;
      case 'sms':
        return <MessageSquare className="h-4 w-4" />;
      case 'phone':
        return <Phone className="h-4 w-4" />;
      default:
        return <MessageSquare className="h-4 w-4" />;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto sm:max-w-[95vw] sm:max-h-[95vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Contact History - {patient.name || 'Unknown Patient'}
          </DialogTitle>
          <DialogDescription>
            View and manage communication history with this patient
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Patient Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Patient Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Name</Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    {patient.name || 'Not provided'}
                  </p>
                </div>
                <div>
                  <Label>Contact Methods</Label>
                  <div className="flex gap-2 mt-1">
                    {patient.phone && (
                      <Badge variant="outline" className="flex items-center gap-1">
                        <Phone className="h-3 w-3" />
                        Phone
                      </Badge>
                    )}
                    {patient.email && (
                      <Badge variant="outline" className="flex items-center gap-1">
                        <Mail className="h-3 w-3" />
                        Email
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'history' | 'new')}>
            <TabsList className="grid w-full grid-cols-2 gap-1">
              <TabsTrigger value="history" className="text-xs sm:text-sm">Contact History</TabsTrigger>
              <TabsTrigger value="new" className="text-xs sm:text-sm">Send New Message</TabsTrigger>
            </TabsList>

            {/* Contact History Tab */}
            <TabsContent value="history" className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium">Recent Communications</h3>
                <Button variant="outline" size="sm" onClick={fetchContactHistory}>
                  Refresh
                </Button>
              </div>

              {isLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                  <p className="text-sm text-muted-foreground mt-2">Loading contact history...</p>
                </div>
              ) : contactHistory.length === 0 ? (
                <Card>
                  <CardContent className="text-center py-8">
                    <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No Contact History</h3>
                    <p className="text-muted-foreground">
                      No previous communications found with this patient.
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4">
                  {contactHistory.map((contact) => (
                    <Card key={contact.id}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              {getMethodIcon(contact.type)}
                              <span className="font-medium">{contact.method}</span>
                              <Badge className={getStatusColor(contact.status)}>
                                {contact.status}
                              </Badge>
                              {getStatusIcon(contact.status)}
                            </div>
                            
                            <div className="space-y-2">
                              <div>
                                <Label className="text-xs text-muted-foreground">Recipient</Label>
                                <p className="text-sm">{contact.recipient}</p>
                              </div>
                              
                              {contact.subject && (
                                <div>
                                  <Label className="text-xs text-muted-foreground">Subject</Label>
                                  <p className="text-sm font-medium">{contact.subject}</p>
                                </div>
                              )}
                              
                              <div>
                                <Label className="text-xs text-muted-foreground">Message</Label>
                                <p className="text-sm">{contact.message}</p>
                              </div>
                              
                              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                <span className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  Sent: {new Date(contact.sentAt).toLocaleString()}
                                </span>
                                {contact.deliveredAt && (
                                  <span className="flex items-center gap-1">
                                    <CheckCircle className="h-3 w-3" />
                                    Delivered: {new Date(contact.deliveredAt).toLocaleString()}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex gap-2 ml-4">
                            {contact.status === 'failed' && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleResend(contact.id)}
                              >
                                <Send className="h-3 w-3 mr-1" />
                                Resend
                              </Button>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* Send New Message Tab */}
            <TabsContent value="new" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Send New Message</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>Message Type</Label>
                    <div className="flex gap-2 mt-2">
                      <Button
                        variant={newMessage.type === 'sms' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setNewMessage(prev => ({ ...prev, type: 'sms' }))}
                        disabled={!patient.phone}
                        className="flex-1"
                      >
                        <MessageSquare className="h-4 w-4 mr-2" />
                        SMS
                      </Button>
                      <Button
                        variant={newMessage.type === 'email' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setNewMessage(prev => ({ ...prev, type: 'email' }))}
                        disabled={!patient.email}
                        className="flex-1"
                      >
                        <Mail className="h-4 w-4 mr-2" />
                        Email
                      </Button>
                    </div>
                  </div>

                  {newMessage.type === 'email' && (
                    <div>
                      <Label htmlFor="subject">Subject</Label>
                      <Input
                        id="subject"
                        value={newMessage.subject}
                        onChange={(e) => setNewMessage(prev => ({ ...prev, subject: e.target.value }))}
                        placeholder="Enter email subject..."
                        className="mt-2"
                      />
                    </div>
                  )}

                  <div>
                    <Label htmlFor="message">Message</Label>
                    <Textarea
                      id="message"
                      value={newMessage.message}
                      onChange={(e) => setNewMessage(prev => ({ ...prev, message: e.target.value }))}
                      placeholder={`Enter your ${newMessage.type === 'email' ? 'email' : 'SMS'} message...`}
                      rows={4}
                      className="mt-2"
                    />
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div className="text-sm text-muted-foreground">
                      {newMessage.type === 'sms' ? (
                        <span>Recipient: {patient.phone || 'No phone number available'}</span>
                      ) : (
                        <span>Recipient: {patient.email || 'No email available'}</span>
                      )}
                    </div>
                    <Button
                      onClick={handleSendMessage}
                      disabled={isLoading || !newMessage.message.trim()}
                      className="w-full sm:w-auto"
                    >
                      <Send className="h-4 w-4 mr-2" />
                      {isLoading ? 'Sending...' : 'Send Message'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}
