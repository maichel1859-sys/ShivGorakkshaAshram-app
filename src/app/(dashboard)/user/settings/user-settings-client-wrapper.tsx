"use client";

import { Suspense, ReactNode } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { User, Shield, Bell, Users } from "lucide-react";
import { GlobalSpinner } from "@/components/loading";
import { useLanguage } from "@/contexts/LanguageContext";

interface UserSettingsClientWrapperProps {
  settingsContent: ReactNode;
  familyContactsContent: ReactNode;
}

export default function UserSettingsClientWrapper({
  settingsContent,
  familyContactsContent,
}: UserSettingsClientWrapperProps) {
  const { t } = useLanguage();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          {t("settings.title", "Settings")}
        </h1>
        <p className="text-muted-foreground">
          {t("settings.manageAccountDescription", "Manage your account settings and preferences.")}
        </p>
      </div>

      <Tabs defaultValue="profile" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="profile" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            {t("settings.profile", "Profile")}
          </TabsTrigger>
          <TabsTrigger
            value="notifications"
            className="flex items-center gap-2"
          >
            <Bell className="h-4 w-4" />
            {t("settings.notifications", "Notifications")}
          </TabsTrigger>
          <TabsTrigger value="privacy" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            {t("settings.privacy", "Privacy")}
          </TabsTrigger>
          <TabsTrigger value="family" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            {t("settings.familyContacts", "Family Contacts")}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t("settings.profileSettings", "Profile Settings")}</CardTitle>
              <CardDescription>
                {t("settings.profileSettingsDescription", "Update your personal information and account details.")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Suspense
                fallback={
                  <div className="flex items-center justify-center py-8">
                    <GlobalSpinner
                      size="md"
                      message={t("settings.loadingProfileSettings", "Loading profile settings...")}
                    />
                  </div>
                }
              >
                {settingsContent}
              </Suspense>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t("settings.notificationPreferences", "Notification Preferences")}</CardTitle>
              <CardDescription>
                {t("settings.notificationPreferencesDescription", "Choose how you want to receive notifications about appointments and updates.")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Suspense fallback={<div>{t("settings.loadingNotificationSettings", "Loading notification settings...")}</div>}>
                {settingsContent}
              </Suspense>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="privacy" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t("settings.privacySettings", "Privacy Settings")}</CardTitle>
              <CardDescription>
                {t("settings.privacySettingsDescription", "Control your privacy and data sharing preferences.")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Suspense fallback={<div>{t("settings.loadingPrivacySettings", "Loading privacy settings...")}</div>}>
                {settingsContent}
              </Suspense>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="family" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t("settings.familyContacts", "Family Contacts")}</CardTitle>
              <CardDescription>
                {t("settings.familyContactsDescription", "Manage emergency contacts and family members who can be notified about your appointments.")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Suspense fallback={<div>{t("settings.loadingFamilyContacts", "Loading family contacts...")}</div>}>
                {familyContactsContent}
              </Suspense>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}