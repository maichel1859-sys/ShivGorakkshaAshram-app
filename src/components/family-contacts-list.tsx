"use client";

import { useState } from "react";
import { useAddFamilyContact, useDeleteFamilyContact } from "@/hooks/queries";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  Trash2,
  UserPlus,
  Users,
} from "lucide-react";

interface FamilyContact {
  id: string;
  name: string;
  phone: string;
  relationship: string;
  isEmergencyContact: boolean;
  createdAt: string;
}

interface FamilyContactsListProps {
  contacts: FamilyContact[];
}

export function FamilyContactsList({ contacts }: FamilyContactsListProps) {
  const [isAdding, setIsAdding] = useState(false);
  
  // React Query hooks
  const addContactMutation = useAddFamilyContact();
  const deleteContactMutation = useDeleteFamilyContact();
  
  const isLoading = addContactMutation.isPending || deleteContactMutation.isPending;

  async function handleAddContact(formData: FormData) {
    addContactMutation.mutate(formData, {
      onSuccess: () => {
        setIsAdding(false);
      }
    });
  }

  async function handleDeleteContact(contactId: string) {
    if (!confirm("Are you sure you want to delete this contact?")) {
      return;
    }
    deleteContactMutation.mutate(contactId);
  }

  return (
    <div className="space-y-6">
      {/* Add Contact Form */}
      {isAdding && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5" />
              Add Family Contact
            </CardTitle>
            <CardDescription>
              Add a new family member or emergency contact
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form action={handleAddContact} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <Input
                    id="name"
                    name="name"
                    placeholder="Enter full name"
                    required
                    disabled={isLoading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    name="phone"
                    type="tel"
                    placeholder="Enter phone number"
                    required
                    disabled={isLoading}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="relationship">Relationship</Label>
                <Input
                  id="relationship"
                  name="relationship"
                  placeholder="e.g., Spouse, Son, Daughter, Friend"
                  required
                  disabled={isLoading}
                />
              </div>

              <div className="flex items-center space-x-2">
                <input
                  id="isEmergencyContact"
                  name="isEmergencyContact"
                  type="checkbox"
                  defaultChecked
                  disabled={isLoading}
                  className="rounded"
                  aria-label="Emergency Contact"
                />
                <Label htmlFor="isEmergencyContact">Emergency Contact</Label>
              </div>

              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsAdding(false)}
                  disabled={isLoading}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? "Adding..." : "Add Contact"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Contacts List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">
            Family Contacts ({contacts.length})
          </h3>
          {!isAdding && (
            <Button onClick={() => setIsAdding(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Contact
            </Button>
          )}
        </div>

        {contacts.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <Users className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No family contacts</h3>
              <p className="text-muted-foreground mb-4">
                Add family members or emergency contacts who can be notified
                about your appointments.
              </p>
              <Button onClick={() => setIsAdding(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Add First Contact
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {contacts.map((contact) => (
              <Card
                key={contact.id}
                className="hover:shadow-md transition-shadow"
              >
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="flex-shrink-0">
                        <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                          <Users className="h-6 w-6 text-primary" />
                        </div>
                      </div>
                      <div>
                        <h4 className="font-semibold">{contact.name}</h4>
                        <p className="text-sm text-muted-foreground">
                          {contact.phone}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className="text-xs">
                            {contact.relationship}
                          </Badge>
                          {contact.isEmergencyContact && (
                            <Badge variant="destructive" className="text-xs">
                              Emergency
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteContact(contact.id)}
                        disabled={isLoading}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t">
                    <p className="text-sm text-muted-foreground">
                      Added: {useTimeStore.getState().formatDate(contact.createdAt)}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
import { useTimeStore } from "@/store/time-store";
