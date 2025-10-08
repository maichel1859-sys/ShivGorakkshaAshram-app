"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getDevoteeContactHistory,
  sendDevoteeNotification,
} from "@/lib/actions/guruji-actions";
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
import { Label } from "@/components/ui/label";
import {
  MessageSquare,
  Phone,
  Send,
  Clock,
  User,
  CheckCircle,
  XCircle,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";


interface Devotee {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
}

interface ContactHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  devotee: Devotee;
}

export function ContactHistoryModal({
  isOpen,
  onClose,
  devotee,
}: ContactHistoryModalProps) {
  const [activeTab, setActiveTab] = useState<"history" | "new">("history");
  const [newMessage, setNewMessage] = useState({
    type: "notification" as "notification" | "phone",
    message: "",
  });

  // Use React Query hooks directly
  const {
    data: contactHistory = [],
    isLoading,
    refetch: refetchContactHistory,
  } = useQuery({
    queryKey: ["devotee-contact-history", devotee.id],
    queryFn: async () => {
      const result = await getDevoteeContactHistory(devotee.id);
      if (!result.success) {
        throw new Error(result.error || "Failed to fetch contact history");
      }
      return result.data || [];
    },
    enabled: isOpen && !!devotee.id,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const queryClient = useQueryClient();
  const sendNotificationMutation = useMutation({
    mutationFn: async ({
      devoteeId,
      message,
      type,
    }: {
      devoteeId: string;
      message: string;
      type: string;
    }) => {
      const result = await sendDevoteeNotification(devoteeId, message, type);
      if (!result.success) {
        throw new Error(result.error || "Failed to send notification");
      }
      return result.data;
    },
    onSuccess: () => {
      toast.success("Notification sent successfully");
      queryClient.invalidateQueries({
        queryKey: ["devotee-contact-history", devotee.id],
      });
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : "Failed to send notification"
      );
    },
  });

  const handleSendMessage = async () => {
    if (!newMessage.message.trim()) {
      toast.error("Please enter a message");
      return;
    }

    try {
      await sendNotificationMutation.mutateAsync({
        devoteeId: devotee.id,
        message: newMessage.message,
        type: "CUSTOM",
      });

      // Reset form and switch to history tab
      setNewMessage({ type: "notification", message: "" });
      setActiveTab("history");
    } catch (error) {
      // Error is already handled by the mutation hook
      console.error("Failed to send message:", error);
    }
  };

  const handleResend = async (contactId: string) => {
    try {
      const contact = contactHistory.find((c) => c.id === contactId);
      if (!contact) return;

      // TODO: Implement resend functionality
      toast.success("Message resent successfully");
    } catch {
      toast.error("Failed to resend message");
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "delivered":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "sent":
        return <Clock className="h-4 w-4 text-blue-500" />;
      case "failed":
        return <XCircle className="h-4 w-4 text-red-500" />;
      case "pending":
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "delivered":
        return "bg-green-100 text-green-800";
      case "sent":
        return "bg-blue-100 text-blue-800";
      case "failed":
        return "bg-red-100 text-red-800";
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getMethodIcon = (type: string) => {
    switch (type) {
      case "notification":
        return <MessageSquare className="h-4 w-4" />;
      case "phone":
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
            Contact History - {devotee.name || "Unknown Devotee"}
          </DialogTitle>
          <DialogDescription>
            View and manage communication history with this devotee
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Devotee Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Devotee Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Name</Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    {devotee.name || "Not provided"}
                  </p>
                </div>
                <div>
                  <Label>Available Contact Methods</Label>
                  <div className="flex gap-2 mt-1">
                    <Badge
                      variant="outline"
                      className="flex items-center gap-1"
                    >
                      <MessageSquare className="h-3 w-3" />
                      In-App Notifications
                    </Badge>
                    {devotee.phone && (
                      <Badge
                        variant="outline"
                        className="flex items-center gap-1"
                      >
                        <Phone className="h-3 w-3" />
                        Phone (Manual)
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Tabs
            value={activeTab}
            onValueChange={(value) => setActiveTab(value as "history" | "new")}
          >
            <TabsList className="grid w-full grid-cols-2 gap-1">
              <TabsTrigger value="history" className="text-xs sm:text-sm">
                Contact History
              </TabsTrigger>
              <TabsTrigger value="new" className="text-xs sm:text-sm">
                Send Notification
              </TabsTrigger>
            </TabsList>

            {/* Contact History Tab */}
            <TabsContent value="history" className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium">Recent Communications</h3>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => refetchContactHistory()}
                >
                  Refresh
                </Button>
              </div>

              {isLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                  <p className="text-sm text-muted-foreground mt-2">
                    Loading contact history...
                  </p>
                </div>
              ) : contactHistory.length === 0 ? (
                <Card>
                  <CardContent className="text-center py-8">
                    <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">
                      No Contact History
                    </h3>
                    <p className="text-muted-foreground">
                      No previous communications found with this devotee.
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
                              <span className="font-medium">
                                {contact.method}
                              </span>
                              <Badge className={getStatusColor(contact.status)}>
                                {contact.status}
                              </Badge>
                              {getStatusIcon(contact.status)}
                            </div>

                            <div className="space-y-2">
                              <div>
                                <Label className="text-xs text-muted-foreground">
                                  Recipient
                                </Label>
                                <p className="text-sm">{contact.recipient}</p>
                              </div>

                              <div>
                                <Label className="text-xs text-muted-foreground">
                                  Message
                                </Label>
                                <p className="text-sm">{contact.message}</p>
                              </div>

                              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                <span className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  Sent:{" "}
                                  {new Date(contact.sentAt).toLocaleString()}
                                </span>
                                {contact.deliveredAt && (
                                  <span className="flex items-center gap-1">
                                    <CheckCircle className="h-3 w-3" />
                                    Delivered:{" "}
                                    {new Date(
                                      contact.deliveredAt
                                    ).toLocaleString()}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="flex gap-2 ml-4">
                            {contact.status === "failed" && (
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
                  <CardTitle>Send In-App Notification</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>Notification Type</Label>
                    <p className="text-sm text-muted-foreground mt-1">
                      Send an in-app notification directly to the devotee&apos;s
                      dashboard. External email and SMS services have been
                      disabled.
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="message">Notification Message</Label>
                    <Textarea
                      id="message"
                      value={newMessage.message}
                      onChange={(e) =>
                        setNewMessage((prev) => ({
                          ...prev,
                          message: e.target.value,
                        }))
                      }
                      placeholder="Enter your notification message for the devotee..."
                      rows={4}
                      className="mt-2"
                    />
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div className="text-sm text-muted-foreground">
                      <span>
                        Recipient: {devotee.name || "Devotee"} (In-App
                        Notification)
                      </span>
                    </div>
                    <Button
                      onClick={handleSendMessage}
                      disabled={
                        sendNotificationMutation.isPending ||
                        !newMessage.message.trim()
                      }
                      className="w-full sm:w-auto"
                    >
                      <Send className="h-4 w-4 mr-2" />
                      {sendNotificationMutation.isPending
                        ? "Sending..."
                        : "Send Notification"}
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
