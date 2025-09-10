"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DashboardLayout } from "@/components/dashboard/layout";
import { 
  Bell, 
  User,
  Save,
  Calendar
} from "lucide-react";

export default function CoordinatorSettingsPage() {
  const [profileSettings, setProfileSettings] = useState({
    name: "Coordinator User",
    email: "coordinator@ashram.com",
    phone: "+1234567890",
    department: "Patient Care",
    role: "COORDINATOR",
  });

  const [notificationSettings, setNotificationSettings] = useState({
    emailNotifications: true,
    smsNotifications: true,
    pushNotifications: true,
    appointmentAlerts: true,
    queueAlerts: true,
    systemAlerts: true,
    emergencyAlerts: true,
  });

  const [workflowSettings, setWorkflowSettings] = useState({
    autoAssignAppointments: true,
    autoNotifyPatients: true,
    queueManagement: "manual",
    appointmentReminders: 24,
    maxQueueLength: 50,
  });

  const handleSave = async (section: string) => {
    try {
      // Here you would typically save to your API
      console.log(`Saving ${section} settings:`, {
        profileSettings,
        notificationSettings,
        workflowSettings,
      });
      
      // Show success message
      alert(`${section} settings saved successfully!`);
    } catch (error) {
      console.error("Error saving settings:", error);
      alert("Error saving settings. Please try again.");
    }
  };

  return (
    <DashboardLayout title="Coordinator Settings" allowedRoles={["COORDINATOR"]}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
            <p className="text-muted-foreground">
              Manage your coordinator settings and preferences
            </p>
          </div>
        </div>

        <Tabs defaultValue="profile" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="profile">Profile</TabsTrigger>
            <TabsTrigger value="notifications">Notifications</TabsTrigger>
            <TabsTrigger value="workflow">Workflow</TabsTrigger>
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
                  Update your coordinator profile information
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
                    <Label htmlFor="department">Department</Label>
                    <Input
                      id="department"
                      value={profileSettings.department}
                      onChange={(e) => setProfileSettings({...profileSettings, department: e.target.value})}
                    />
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
                      <Label>Queue Alerts</Label>
                      <p className="text-sm text-muted-foreground">
                        Get notified about queue changes
                      </p>
                    </div>
                    <Switch
                      checked={notificationSettings.queueAlerts}
                      onCheckedChange={(checked) => setNotificationSettings({...notificationSettings, queueAlerts: checked})}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Emergency Alerts</Label>
                      <p className="text-sm text-muted-foreground">
                        Receive emergency notifications
                      </p>
                    </div>
                    <Switch
                      checked={notificationSettings.emergencyAlerts}
                      onCheckedChange={(checked) => setNotificationSettings({...notificationSettings, emergencyAlerts: checked})}
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

          {/* Workflow Settings */}
          <TabsContent value="workflow" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Workflow Settings
                </CardTitle>
                <CardDescription>
                  Configure your workflow and automation preferences
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Auto-Assign Appointments</Label>
                      <p className="text-sm text-muted-foreground">
                        Automatically assign appointments to available gurujis
                      </p>
                    </div>
                    <Switch
                      checked={workflowSettings.autoAssignAppointments}
                      onCheckedChange={(checked) => setWorkflowSettings({...workflowSettings, autoAssignAppointments: checked})}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Auto-Notify Patients</Label>
                      <p className="text-sm text-muted-foreground">
                        Automatically send notifications to patients
                      </p>
                    </div>
                    <Switch
                      checked={workflowSettings.autoNotifyPatients}
                      onCheckedChange={(checked) => setWorkflowSettings({...workflowSettings, autoNotifyPatients: checked})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="queueManagement">Queue Management</Label>
                    <Select value={workflowSettings.queueManagement} onValueChange={(value) => setWorkflowSettings({...workflowSettings, queueManagement: value})}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="manual">Manual</SelectItem>
                        <SelectItem value="semi_auto">Semi-Automatic</SelectItem>
                        <SelectItem value="auto">Automatic</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="appointmentReminders">Appointment Reminders (hours)</Label>
                      <Input
                        id="appointmentReminders"
                        type="number"
                        value={workflowSettings.appointmentReminders}
                        onChange={(e) => setWorkflowSettings({...workflowSettings, appointmentReminders: parseInt(e.target.value)})}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="maxQueueLength">Max Queue Length</Label>
                      <Input
                        id="maxQueueLength"
                        type="number"
                        value={workflowSettings.maxQueueLength}
                        onChange={(e) => setWorkflowSettings({...workflowSettings, maxQueueLength: parseInt(e.target.value)})}
                      />
                    </div>
                  </div>
                </div>
                <Button onClick={() => handleSave("workflow")}>
                  <Save className="mr-2 h-4 w-4" />
                  Save Workflow Settings
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
} 