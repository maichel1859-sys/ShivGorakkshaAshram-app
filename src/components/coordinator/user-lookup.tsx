"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Search,
  Phone,
  Mail,
  Calendar,
  Clock,
  UserCheck,
  AlertCircle,
  CheckCircle,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { userLookupSchema, type UserLookup } from "@/lib/validation/unified-schemas";
import { searchUsers } from "@/lib/actions/reception-actions";

interface UserLookupComponentProps {
  onComplete: (result: { found: boolean; user?: Record<string, unknown>; action?: string }) => void;
  onCancel?: () => void;
  autoFocus?: boolean;
}

interface SearchResult {
  id: string;
  name: string | null;
  phone?: string | null;
  email?: string | null;
  lastVisit?: string;
  totalVisits: number;
  status: "ACTIVE" | "INACTIVE" | string;
  upcomingAppointments: number;
  userCategory?: string;
  [key: string]: unknown;
}

export function UserLookupComponent({ onComplete, onCancel, autoFocus = true }: UserLookupComponentProps) {
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [selectedUser, setSelectedUser] = useState<SearchResult | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<UserLookup>({
    resolver: zodResolver(userLookupSchema),
    defaultValues: {
      searchType: "PHONE",
      includeInactive: false,
    },
  });

  const searchType = watch("searchType");
  const searchTerm = watch("searchTerm");

  // Auto-search as user types (debounced)
  useEffect(() => {
    if (!searchTerm || searchTerm.length < 3) {
      setSearchResults([]);
      setHasSearched(false);
      return;
    }

    const timeoutId = setTimeout(() => {
      performSearch({ searchTerm, searchType, includeInactive: false });
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [searchTerm, searchType]);

  const performSearch = async (data: UserLookup) => {
    setIsSearching(true);
    setHasSearched(true);
    
    try {
      // Create FormData for server action
      const formData = new FormData();
      Object.entries(data).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== "") {
          formData.append(key, typeof value === "boolean" ? value.toString() : value.toString());
        }
      });

      // Call server action to search users
      const result = await searchUsers(formData);
      
      if (!result.success) {
        toast.error(result.error || "Failed to search patients");
        setSearchResults([]);
        return;
      }

      setSearchResults(result.users || []);
      
      if (result.users && result.users.length === 0) {
        toast.info("No patients found matching your search criteria");
      }
    } catch (error) {
      console.error("Search error:", error);
      toast.error("Failed to search patients. Please try again.");
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleUserSelect = (user: SearchResult) => {
    setSelectedUser(user);
  };

  const handleConfirmSelection = (action: string) => {
    if (!selectedUser) return;
    
    onComplete({
      found: true,
      user: selectedUser,
      action,
    });
  };

  const handleCreateNew = () => {
    onComplete({
      found: false,
    });
  };

  const getSearchPlaceholder = () => {
    switch (searchType) {
      case "PHONE": return "Enter phone number (e.g., 9876543210)";
      case "EMAIL": return "Enter email address";
      case "NAME": return "Enter patient name";
      case "ID": return "Enter patient ID";
      default: return "Enter search term";
    }
  };

  const formatLastVisit = (date: string) => {
    const visitDate = new Date(date);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - visitDate.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 30) return `${diffDays} days ago`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
    return `${Math.floor(diffDays / 365)} years ago`;
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Search Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Find Existing Patient
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(performSearch)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="md:col-span-1">
                <Label htmlFor="searchType">Search By</Label>
                <Select 
                  value={searchType} 
                  onValueChange={(value) => setValue("searchType", value as "PHONE" | "EMAIL" | "NAME" | "ID")}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PHONE">Phone Number</SelectItem>
                    <SelectItem value="NAME">Patient Name</SelectItem>
                    <SelectItem value="EMAIL">Email Address</SelectItem>
                    <SelectItem value="ID">Patient ID</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="md:col-span-2">
                <Label htmlFor="searchTerm">Search Term</Label>
                <Input
                  id="searchTerm"
                  {...register("searchTerm")}
                  placeholder={getSearchPlaceholder()}
                  autoFocus={autoFocus}
                  className={errors.searchTerm ? "border-red-500" : ""}
                />
                {errors.searchTerm && (
                  <p className="text-sm text-red-500 mt-1">{errors.searchTerm.message}</p>
                )}
              </div>

              <div className="flex items-end gap-2">
                <Button type="submit" disabled={isSearching || !searchTerm}>
                  {isSearching ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Search className="h-4 w-4 mr-2" />
                  )}
                  Search
                </Button>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Search Results */}
      {hasSearched && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Search Results</span>
              {searchResults.length > 0 && (
                <Badge variant="outline">
                  {searchResults.length} patient{searchResults.length !== 1 ? 's' : ''} found
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isSearching ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                <span className="ml-2 text-gray-600">Searching patients...</span>
              </div>
            ) : searchResults.length === 0 ? (
              <div className="text-center py-8">
                <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No patients found</h3>
                <p className="text-gray-600 mb-4">
                  No patients match your search criteria. This might be a new patient.
                </p>
                <Button onClick={handleCreateNew}>
                  <UserCheck className="h-4 w-4 mr-2" />
                  Register New Patient
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {searchResults.map((user) => (
                  <div
                    key={user.id}
                    className={`p-4 border rounded-lg cursor-pointer transition-all hover:bg-gray-50 ${
                      selectedUser?.id === user.id ? "border-blue-500 bg-blue-50" : "border-gray-200"
                    }`}
                    onClick={() => handleUserSelect(user)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <Avatar className="h-12 w-12">
                          <AvatarFallback className="bg-blue-100 text-blue-600">
                            {user.name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'U'}
                          </AvatarFallback>
                        </Avatar>
                        
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-medium text-gray-900">{user.name || 'Unknown User'}</h3>
                            <Badge 
                              variant={user.status === "ACTIVE" ? "default" : "secondary"}
                              className="text-xs"
                            >
                              {user.status}
                            </Badge>
                            {user.userCategory && (
                              <Badge variant="outline" className="text-xs">
                                {user.userCategory.replace('_', ' ')}
                              </Badge>
                            )}
                          </div>
                          
                          <div className="space-y-1 text-sm text-gray-600">
                            {user.phone && (
                              <div className="flex items-center gap-1">
                                <Phone className="h-3 w-3" />
                                <span>{user.phone}</span>
                              </div>
                            )}
                            {user.email && (
                              <div className="flex items-center gap-1">
                                <Mail className="h-3 w-3" />
                                <span>{user.email}</span>
                              </div>
                            )}
                            <div className="flex items-center gap-4">
                              <div className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                <span>Last visit: {formatLastVisit(user.lastVisit!)}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                <span>{user.totalVisits} total visits</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="text-right">
                        {user.upcomingAppointments > 0 && (
                          <Badge className="bg-green-100 text-green-800 mb-2">
                            {user.upcomingAppointments} upcoming appointment{user.upcomingAppointments !== 1 ? 's' : ''}
                          </Badge>
                        )}
                        {selectedUser?.id === user.id && (
                          <CheckCircle className="h-5 w-5 text-blue-500" />
                        )}
                      </div>
                    </div>
                  </div>
                ))}

                {/* Action Buttons */}
                {selectedUser && (
                  <div className="pt-4 border-t">
                    <div className="flex items-center justify-between">
                      <div className="text-sm text-gray-600">
                        Selected: <span className="font-medium">{selectedUser.name || 'Unknown User'}</span>
                      </div>
                      <div className="flex gap-2">
                        {selectedUser.upcomingAppointments > 0 ? (
                          <Button onClick={() => handleConfirmSelection("checkin")}>
                            <UserCheck className="h-4 w-4 mr-2" />
                            Check-in Patient
                          </Button>
                        ) : (
                          <Button onClick={() => handleConfirmSelection("book")}>
                            <Calendar className="h-4 w-4 mr-2" />
                            Book Appointment
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Option to create new anyway */}
                <div className="pt-4 border-t">
                  <Button variant="outline" onClick={handleCreateNew} className="w-full">
                    <UserCheck className="h-4 w-4 mr-2" />
                    Register as New Patient Instead
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Cancel Button */}
      {onCancel && (
        <div className="flex justify-center">
          <Button variant="ghost" onClick={onCancel}>
            Cancel Search
          </Button>
        </div>
      )}
    </div>
  );
}