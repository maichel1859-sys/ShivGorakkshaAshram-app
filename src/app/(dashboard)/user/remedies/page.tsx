"use client";

import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/dashboard/layout";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/common/StatusBadge";
import { Search, FileText, Calendar, User, Download, Eye } from "lucide-react";
import toast from "react-hot-toast";

interface RemedyDocument {
  id: string;
  templateName: string;
  gurujiName: string;
  consultationDate: string;
  status: string;
  customInstructions?: string;
  customDosage?: string;
  customDuration?: string;
  pdfUrl?: string;
  emailSent: boolean;
  smsSent: boolean;
  deliveredAt?: string;
  createdAt: string;
}

export default function UserRemediesPage() {
  const [remedies, setRemedies] = useState<RemedyDocument[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    fetchRemedies();
  }, []);

  const fetchRemedies = async () => {
    try {
      // Mock data for now
      const mockRemedies: RemedyDocument[] = [
        {
          id: "1",
          templateName: "Ayurvedic Immunity Boost",
          gurujiName: "Dr. Sharma",
          consultationDate: "2024-01-20",
          status: "ACTIVE",
          customInstructions: "Take with warm water in the morning",
          customDosage: "1 tablet twice daily",
          customDuration: "30 days",
          pdfUrl: "/remedies/remedy-1.pdf",
          emailSent: true,
          smsSent: true,
          deliveredAt: "2024-01-20T10:30:00Z",
          createdAt: "2024-01-20",
        },
        {
          id: "2",
          templateName: "Homeopathic Stress Relief",
          gurujiName: "Dr. Patel",
          consultationDate: "2024-01-18",
          status: "COMPLETED",
          customInstructions: "Take 30 minutes before meals",
          customDosage: "5 drops in water",
          customDuration: "21 days",
          pdfUrl: "/remedies/remedy-2.pdf",
          emailSent: true,
          smsSent: false,
          deliveredAt: "2024-01-18T14:15:00Z",
          createdAt: "2024-01-18",
        },
        {
          id: "3",
          templateName: "Spiritual Cleansing",
          gurujiName: "Dr. Gupta",
          consultationDate: "2024-01-15",
          status: "PENDING",
          customInstructions: "Practice meditation daily",
          customDosage: "As prescribed",
          customDuration: "7 days",
          emailSent: false,
          smsSent: false,
          createdAt: "2024-01-15",
        },
      ];

      setRemedies(mockRemedies);
    } catch (error) {
      console.error("Failed to fetch remedies:", error);
      toast.error("Failed to load remedies");
    } finally {
      setIsLoading(false);
    }
  };

  const filteredRemedies = remedies.filter(
    (remedy) =>
      remedy.templateName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      remedy.gurujiName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (isLoading) {
    return (
      <DashboardLayout title="My Remedies" allowedRoles={["USER"]}>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="My Remedies" allowedRoles={["USER"]}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">My Remedies</h2>
            <p className="text-muted-foreground">
              View and manage your prescribed remedies
            </p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Remedies
              </CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{remedies.length}</div>
              <p className="text-xs text-muted-foreground">
                All time prescriptions
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {remedies.filter((r) => r.status === "ACTIVE").length}
              </div>
              <p className="text-xs text-muted-foreground">
                Current treatments
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Completed</CardTitle>
              <User className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {remedies.filter((r) => r.status === "COMPLETED").length}
              </div>
              <p className="text-xs text-muted-foreground">
                Finished treatments
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">This Month</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">2</div>
              <p className="text-xs text-muted-foreground">New prescriptions</p>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <div className="flex items-center space-x-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search remedies..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8"
            />
          </div>
        </div>

        {/* Remedies List */}
        <div className="space-y-4">
          {filteredRemedies.map((remedy) => (
            <Card key={remedy.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">
                    {remedy.templateName}
                  </CardTitle>
                  <StatusBadge value={remedy.status} type="status" />
                </div>
                <CardDescription>
                  Prescribed by {remedy.gurujiName} on{" "}
                  {new Date(remedy.consultationDate).toLocaleDateString()}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="flex items-center space-x-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Duration</p>
                      <p className="font-medium">{remedy.customDuration}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Dosage</p>
                      <p className="font-medium">{remedy.customDosage}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Guruji</p>
                      <p className="font-medium">{remedy.gurujiName}</p>
                    </div>
                  </div>
                </div>

                {remedy.customInstructions && (
                  <div className="bg-muted p-3 rounded-md">
                    <p className="text-sm font-medium mb-1">Instructions:</p>
                    <p className="text-sm text-muted-foreground">
                      {remedy.customInstructions}
                    </p>
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                    <span>
                      Email: {remedy.emailSent ? "✓ Sent" : "✗ Not sent"}
                    </span>
                    <span>SMS: {remedy.smsSent ? "✓ Sent" : "✗ Not sent"}</span>
                    {remedy.deliveredAt && (
                      <span>
                        Delivered:{" "}
                        {new Date(remedy.deliveredAt).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button variant="outline" size="sm">
                      <Eye className="h-4 w-4 mr-1" />
                      View Details
                    </Button>
                    {remedy.pdfUrl && (
                      <Button variant="outline" size="sm">
                        <Download className="h-4 w-4 mr-1" />
                        Download PDF
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          {filteredRemedies.length === 0 && (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-8">
                <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No remedies found</h3>
                <p className="text-muted-foreground text-center mb-4">
                  {searchTerm
                    ? "Try adjusting your search criteria"
                    : "You don&apos;t have any prescribed remedies yet"}
                </p>
                <p className="text-sm text-muted-foreground text-center">
                  Remedies will appear here after your consultations with
                  gurujis
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
