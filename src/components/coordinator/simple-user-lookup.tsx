"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Search,
  User,
  Phone,
  Calendar,
  CheckCircle,
  XCircle,
  ArrowLeft,
} from "lucide-react";
import { toast } from "sonner";

interface SimpleUserLookupProps {
  onComplete: (result: { found: boolean; user?: any }) => void;
  onCancel: () => void;
}

export function SimpleUserLookup({
  onComplete,
  onCancel,
}: SimpleUserLookupProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [hasSearched, setHasSearched] = useState(false);

  // Mock user data - replace with actual API call
  const mockUsers = [
    {
      id: "1",
      name: "Rajesh Kumar",
      phone: "+91 98765 43210",
      email: "rajesh@example.com",
      lastVisit: "2024-01-15",
      hasAppointment: true,
      appointmentTime: "10:30 AM",
    },
    {
      id: "2",
      name: "Priya Sharma",
      phone: "+91 87654 32109",
      email: "priya@example.com",
      lastVisit: "2024-01-10",
      hasAppointment: false,
    },
    {
      id: "3",
      name: "Amit Patel",
      phone: "+91 76543 21098",
      lastVisit: "2024-01-08",
      hasAppointment: true,
      appointmentTime: "2:00 PM",
    },
  ];

  const handleSearch = async () => {
    if (!searchTerm.trim()) {
      toast.error("Please enter a phone number or name to search");
      return;
    }

    setIsSearching(true);
    setHasSearched(true);

    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const results = mockUsers.filter(
        (user) =>
          user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          user.phone.includes(searchTerm) ||
          user.email?.toLowerCase().includes(searchTerm.toLowerCase())
      );

      setSearchResults(results);

      if (results.length === 0) {
        toast.info("No devotees found with that information");
      }
    } catch (error) {
      toast.error("Search failed. Please try again.");
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectUser = (user: any) => {
    onComplete({ found: true, user });
  };

  const handleNoResults = () => {
    onComplete({ found: false });
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Search className="h-6 w-6 text-green-600" />
            <CardTitle className="text-xl">Find Existing Devotee</CardTitle>
          </div>
          <Button variant="ghost" onClick={onCancel}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Search Form */}
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="search">Search by Phone Number or Name</Label>
            <div className="flex gap-2">
              <Input
                id="search"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Enter phone number or name..."
                onKeyPress={(e) => e.key === "Enter" && handleSearch()}
              />
              <Button onClick={handleSearch} disabled={isSearching}>
                {isSearching ? "Searching..." : "Search"}
              </Button>
            </div>
          </div>
        </div>

        {/* Search Results */}
        {hasSearched && (
          <div className="space-y-4">
            {searchResults.length > 0 ? (
              <div className="space-y-3">
                <h3 className="font-medium">
                  Search Results ({searchResults.length})
                </h3>
                {searchResults.map((user) => (
                  <div
                    key={user.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 cursor-pointer"
                    onClick={() => handleSelectUser(user)}
                  >
                    <div className="flex items-center space-x-3">
                      <Avatar className="h-10 w-10">
                        <AvatarFallback>
                          {user.name
                            .split(" ")
                            .map((n) => n[0])
                            .join("")
                            .toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{user.name}</p>
                        <div className="flex items-center gap-4 text-sm text-gray-600">
                          <span className="flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            {user.phone}
                          </span>
                          {user.email && <span>{user.email}</span>}
                        </div>
                        <p className="text-xs text-gray-500">
                          Last visit: {user.lastVisit}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      {user.hasAppointment ? (
                        <div className="space-y-1">
                          <Badge
                            variant="default"
                            className="bg-green-100 text-green-800"
                          >
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Has Appointment
                          </Badge>
                          <p className="text-sm font-medium">
                            {user.appointmentTime}
                          </p>
                        </div>
                      ) : (
                        <Badge variant="outline">
                          <XCircle className="h-3 w-3 mr-1" />
                          No Appointment
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <User className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-600 mb-2">
                  No Devotees Found
                </h3>
                <p className="text-gray-500 mb-4">
                  No devotees found with the search term "{searchTerm}"
                </p>
                <div className="space-x-2">
                  <Button variant="outline" onClick={() => setSearchTerm("")}>
                    Try Different Search
                  </Button>
                  <Button onClick={handleNoResults}>
                    Register New Devotee
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Instructions */}
        {!hasSearched && (
          <div className="bg-blue-50 p-4 rounded-lg">
            <h4 className="font-medium text-blue-900 mb-2">
              Search Instructions
            </h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Enter phone number (with or without country code)</li>
              <li>• Enter full name or partial name</li>
              <li>• Enter email address</li>
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
