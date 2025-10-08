import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth/auth";

import { getUserSettings, getFamilyContacts } from "@/lib/actions";
import { UserSettingsForm } from "@/components/forms/user-settings-form";
import { FamilyContactsList } from "@/components/family-contacts-list";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle } from "lucide-react";
import UserSettingsClientWrapper from "./user-settings-client-wrapper";

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
    redirect("/signin");
  }

  return (
    <UserSettingsClientWrapper
      settingsContent={<UserSettingsServer />}
      familyContactsContent={<FamilyContactsServer />}
    />
  );
}
