"use client";

import { useState } from "react";
import { DashboardLayout } from "@/components/dashboard/layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Bell, 
  User,
  Save,
  Heart
} from "lucide-react";

export default function GurujiSettingsPage() {
  const [profileSettings, setProfileSettings] = useState({
    name: "Guruji User",
    email: "guruji@ashram.com",
    phone: "+1234567890",
    specialization: "Ayurvedic Medicine",
    experience: "15 years",
    availability: "full_time",
  });

  const [notificationSettings, setNotificationSettings] = useState({
    emailNotifications: true,
    smsNotifications: true,
    pushNotifications: true,
    appointmentAlerts: true,
    patientAlerts: true,
    systemAlerts: false,
  });

  const [consultationSettings, setConsultationSettings] = useState({
    maxPatientsPerDay: 20,
    consultationDuration: 30,
    autoAcceptAppointments: false,
    allowWalkIns: true,
    recordingEnabled: true,
    notesTemplate: "default",
  });

  const handleSave = async (section: string) => {
    try {
      // Here you would typically save to your API
      console.log(`Saving ${section} settings:`, {
        profileSettings,
        notificationSettings,
        consultationSettings,
      });
      
      // Show success message
      alert(`${section} settings saved successfully!`);
    } catch (error) {
      console.error("Error saving settings:", error);
      alert("Error saving settings. Please try again.");
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
            <p className="text-muted-foreground">
              Manage your guruji settings and preferences
            </p>
          </div>
        </div>

        <Tabs defaultValue="profile" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="profile">Profile</TabsTrigger>
            <TabsTrigger value="notifications">Notifications</TabsTrigger>
            <TabsTrigger value="consultation">Consultation</TabsTrigger>
          </TabsList>

          {/* Profile Settings */}
          <TabsContent value="profile" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Profile Information
                </CardTitle>
                <CardDescription>
                  Update your guruji profile information
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Full Name</Label>
                    <Input
                      id="name"
                      value={profileSettings.name}
                      onChange={(e) => setProfileSettings({...profileSettings, name: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={profileSettings.email}
                      onChange={(e) => setProfileSettings({...profileSettings, email: e.target.value})}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number</Label>
                    <Input
                      id="phone"
                      value={profileSettings.phone}
                      onChange={(e) => setProfileSettings({...profileSettings, phone: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="specialization">Specialization</Label>
                    <Input
                      id="specialization"
                      value={profileSettings.specialization}
                      onChange={(e) => setProfileSettings({...profileSettings, specialization: e.target.value})}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="experience">Experience</Label>
                    <Input
                      id="experience"
                      value={profileSettings.experience}
                      onChange={(e) => setProfileSettings({...profileSettings, experience: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="availability">Availability</Label>
                    <Select value={profileSettings.availability} onValueChange={(value) => setProfileSettings({...profileSettings, availability: value})}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="full_time">Full Time</SelectItem>
                        <SelectItem value="part_time">Part Time</SelectItem>
                        <SelectItem value="weekends">Weekends Only</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <Button onClick={() => handleSave("profile")}>
                  <Save className="mr-2 h-4 w-4" />
                  Save Profile
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Notification Settings */}
          <TabsContent value="notifications" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="h-5 w-5" />
                  Notification Preferences
                </CardTitle>
                <CardDescription>
                  Choose how you want to receive notifications
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Email Notifications</Label>
                      <p className="text-sm text-muted-foreground">
                        Receive notifications via email
                      </p>
                    </div>
                    <Switch
                      checked={notificationSettings.emailNotifications}
                      onCheckedChange={(checked) => setNotificationSettings({...notificationSettings, emailNotifications: checked})}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>SMS Notifications</Label>
                      <p className="text-sm text-muted-foreground">
                        Receive notifications via SMS
                      </p>
                    </div>
                    <Switch
                      checked={notificationSettings.smsNotifications}
                      onCheckedChange={(checked) => setNotificationSettings({...notificationSettings, smsNotifications: checked})}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Appointment Alerts</Label>
                      <p className="text-sm text-muted-foreground">
                        Get notified about new appointments
                      </p>
                    </div>
                    <Switch
                      checked={notificationSettings.appointmentAlerts}
                      onCheckedChange={(checked) => setNotificationSettings({...notificationSettings, appointmentAlerts: checked})}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Patient Alerts</Label>
                      <p className="text-sm text-muted-foreground">
                        Get notified about patient updates
                      </p>
                    </div>
                    <Switch
                      checked={notificationSettings.patientAlerts}
                      onCheckedChange={(checked) => setNotificationSettings({...notificationSettings, patientAlerts: checked})}
                    />
                  </div>
                </div>
                <Button onClick={() => handleSave("notifications")}>
                  <Save className="mr-2 h-4 w-4" />
                  Save Notification Settings
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Consultation Settings */}
          <TabsContent value="consultation" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Heart className="h-5 w-5" />
                  Consultation Settings
                </CardTitle>
                <CardDescription>
                  Configure your consultation preferences and workflow
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Auto-Accept Appointments</Label>
                      <p className="text-sm text-muted-foreground">
                        Automatically accept new appointments
                      </p>
                    </div>
                    <Switch
                      checked={consultationSettings.autoAcceptAppointments}
                      onCheckedChange={(checked) => setConsultationSettings({...consultationSettings, autoAcceptAppointments: checked})}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Allow Walk-ins</Label>
                      <p className="text-sm text-muted-foreground">
                        Accept walk-in patients
                      </p>
                    </div>
                    <Switch
                      checked={consultationSettings.allowWalkIns}
                      onCheckedChange={(checked) => setConsultationSettings({...consultationSettings, allowWalkIns: checked})}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Enable Recording</Label>
                      <p className="text-sm text-muted-foreground">
                        Record consultation sessions
                      </p>
                    </div>
                    <Switch
                      checked={consultationSettings.recordingEnabled}
                      onCheckedChange={(checked) => setConsultationSettings({...consultationSettings, recordingEnabled: checked})}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="maxPatientsPerDay">Max Patients per Day</Label>
                      <Input
                        id="maxPatientsPerDay"
                        type="number"
                        value={consultationSettings.maxPatientsPerDay}
                        onChange={(e) => setConsultationSettings({...consultationSettings, maxPatientsPerDay: parseInt(e.target.value)})}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="consultationDuration">Consultation Duration (min)</Label>
                      <Input
                        id="consultationDuration"
                        type="number"
                        value={consultationSettings.consultationDuration}
                        onChange={(e) => setConsultationSettings({...consultationSettings, consultationDuration: parseInt(e.target.value)})}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="notesTemplate">Notes Template</Label>
                    <Select value={consultationSettings.notesTemplate} onValueChange={(value) => setConsultationSettings({...consultationSettings, notesTemplate: value})}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="default">Default Template</SelectItem>
                        <SelectItem value="detailed">Detailed Template</SelectItem>
                        <SelectItem value="minimal">Minimal Template</SelectItem>
                        <SelectItem value="custom">Custom Template</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <Button onClick={() => handleSave("consultation")}>
                  <Save className="mr-2 h-4 w-4" />
                  Save Consultation Settings
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
} 