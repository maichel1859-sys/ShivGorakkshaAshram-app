"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, FileText, Calendar, User, Download, Eye } from "lucide-react";
import toast from "react-hot-toast";

interface RemedyDocument {
  id: string;
  templateName: string;
  gurujiName: string;
  consultationDate: string;
  status: "ACTIVE" | "COMPLETED" | "PENDING";
  customInstructions: string;
  customDosage: string;
  customDuration: string;
  pdfUrl: string;
  emailSent: boolean;
  smsSent: boolean;
  deliveredAt: string;
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
      // Fetch real data from API
      const response = await fetch("/api/user/remedies");
      if (!response.ok) {
        throw new Error("Failed to fetch remedies");
      }
      const data = await response.json();
      setRemedies(data.remedies || []);
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case "ACTIVE":
        return "bg-green-100 text-green-800";
      case "COMPLETED":
        return "bg-blue-100 text-blue-800";
      case "PENDING":
        return "bg-yellow-100 text-yellow-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Search and Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search remedies..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8"
            />
          </div>
        </CardContent>
      </Card>

      {/* Remedies List */}
      <div className="grid gap-4">
        {filteredRemedies.map((remedy) => (
          <Card key={remedy.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <FileText className="h-5 w-5 text-primary" />
                    <h3 className="font-semibold text-lg">
                      {remedy.templateName}
                    </h3>
                    <Badge className={getStatusColor(remedy.status)}>
                      {remedy.status}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <User className="h-4 w-4" />
                      <span>Guruji: {remedy.gurujiName}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      <span>Consultation: {remedy.consultationDate}</span>
                    </div>
                  </div>

                  {remedy.customInstructions && (
                    <div className="mb-3">
                      <p className="text-sm font-medium mb-1">Instructions:</p>
                      <p className="text-sm text-muted-foreground">
                        {remedy.customInstructions}
                      </p>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm">
                    {remedy.customDosage && (
                      <div>
                        <span className="font-medium">Dosage:</span>{" "}
                        {remedy.customDosage}
                      </div>
                    )}
                    {remedy.customDuration && (
                      <div>
                        <span className="font-medium">Duration:</span>{" "}
                        {remedy.customDuration}
                      </div>
                    )}
                    <div>
                      <span className="font-medium">Created:</span>{" "}
                      {remedy.createdAt}
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-2 ml-4">
                  {remedy.pdfUrl && (
                    <Button variant="outline" size="sm" asChild>
                      <a
                        href={remedy.pdfUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <Download className="mr-2 h-4 w-4" />
                        Download
                      </a>
                    </Button>
                  )}
                  <Button variant="outline" size="sm">
                    <Eye className="mr-2 h-4 w-4" />
                    View Details
                  </Button>
                </div>
              </div>

              {/* Delivery Status */}
              <div className="mt-4 pt-4 border-t">
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <div className="flex items-center gap-4">
                    <span
                      className={`flex items-center gap-1 ${remedy.emailSent ? "text-green-600" : "text-gray-400"}`}
                    >
                      {remedy.emailSent ? "✓" : "○"} Email
                    </span>
                    <span
                      className={`flex items-center gap-1 ${remedy.smsSent ? "text-green-600" : "text-gray-400"}`}
                    >
                      {remedy.smsSent ? "✓" : "○"} SMS
                    </span>
                  </div>
                  {remedy.deliveredAt && (
                    <span>
                      Delivered:{" "}
                      {new Date(remedy.deliveredAt).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredRemedies.length === 0 && (
        <Card>
          <CardContent className="p-8 text-center">
            <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No remedies found</h3>
            <p className="text-muted-foreground">
              {searchTerm
                ? "No remedies match your search."
                : "You haven't received any remedies yet."}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
