import { Suspense } from "react";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/core/auth";

import { getUserSettings, getFamilyContacts } from "@/lib/actions";
import { UserSettingsForm } from "@/components/forms/user-settings-form";
import { FamilyContactsList } from "@/components/family-contacts-list";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle, User, Shield, Bell, Users } from "lucide-react";

// Server Component for User Settings
async function UserSettingsServer() {
  const settingsResult = await getUserSettings();

  if (!settingsResult.success || !settingsResult.settings) {
    return (
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          Failed to load user settings:{" "}
          {settingsResult.error || "Settings not available"}
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <UserSettingsForm
      initialSettings={
        settingsResult.settings as unknown as Parameters<
          typeof UserSettingsForm
        >[0]["initialSettings"]
      }
    />
  );
}

// Server Component for Family Contacts
async function FamilyContactsServer() {
  const contactsResult = await getFamilyContacts();

  if (!contactsResult.success || !contactsResult.contacts) {
    return (
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          Failed to load family contacts:{" "}
          {contactsResult.error || "No contacts available"}
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <FamilyContactsList
      contacts={
        contactsResult.contacts as unknown as Parameters<
          typeof FamilyContactsList
        >[0]["contacts"]
      }
    />
  );
}

export default async function UserSettingsPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect("/auth/signin");
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">
          Manage your account settings and preferences.
        </p>
      </div>

      <Tabs defaultValue="profile" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="profile" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            Profile
          </TabsTrigger>
          <TabsTrigger
            value="notifications"
            className="flex items-center gap-2"
          >
            <Bell className="h-4 w-4" />
            Notifications
          </TabsTrigger>
          <TabsTrigger value="privacy" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Privacy
          </TabsTrigger>
          <TabsTrigger value="family" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Family Contacts
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Profile Settings</CardTitle>
              <CardDescription>
                Update your personal information and account details.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Suspense fallback={<div>Loading profile settings...</div>}>
                <UserSettingsServer />
              </Suspense>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Notification Preferences</CardTitle>
              <CardDescription>
                Choose how you want to receive notifications about appointments
                and updates.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Suspense fallback={<div>Loading notification settings...</div>}>
                <UserSettingsServer />
              </Suspense>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="privacy" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Privacy Settings</CardTitle>
              <CardDescription>
                Control your privacy and data sharing preferences.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Suspense fallback={<div>Loading privacy settings...</div>}>
                <UserSettingsServer />
              </Suspense>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="family" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Family Contacts</CardTitle>
              <CardDescription>
                Manage emergency contacts and family members who can be notified
                about your appointments.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Suspense fallback={<div>Loading family contacts...</div>}>
                <FamilyContactsServer />
              </Suspense>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
