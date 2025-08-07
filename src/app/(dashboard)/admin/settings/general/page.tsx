"use client";

import { useEffect, useCallback } from "react";
import { DashboardLayout } from "@/components/dashboard/layout";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
  Save,
  RefreshCw,
  Clock,
  Globe,
  Bell,
  Database,
  ArrowLeft,
} from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { useSystemSettings, useUpdateSystemSettings } from "@/hooks/queries";

const settingsSchema = z.object({
  siteName: z.string().min(1, "Site name is required"),
  siteDescription: z.string().optional(),
  contactEmail: z.string().email("Invalid email address"),
  contactPhone: z.string().optional(),
  timezone: z.string().min(1, "Timezone is required"),
  language: z.string().min(1, "Language is required"),
  dateFormat: z.string().min(1, "Date format is required"),
  timeFormat: z.string().min(1, "Time format is required"),
  appointmentSlotDuration: z
    .number()
    .min(15, "Minimum 15 minutes")
    .max(180, "Maximum 3 hours"),
  maxAdvanceBookingDays: z
    .number()
    .min(1, "Minimum 1 day")
    .max(365, "Maximum 365 days"),
  allowCancellation: z.boolean(),
  cancellationDeadlineHours: z
    .number()
    .min(0, "Cannot be negative")
    .max(168, "Maximum 1 week"),
  enableNotifications: z.boolean(),
  enableSmsNotifications: z.boolean(),
  enableEmailNotifications: z.boolean(),
  autoBackupEnabled: z.boolean(),
  backupFrequencyHours: z
    .number()
    .min(1, "Minimum 1 hour")
    .max(168, "Maximum 1 week"),
  maintenanceMode: z.boolean(),
  maintenanceMessage: z.string().optional(),
});

type SettingsFormData = z.infer<typeof settingsSchema>;

interface SystemSetting {
  key: string;
  value: string;
  category: string | null;
  description?: string | null;
}

export default function GeneralSettingsPage() {
  const router = useRouter();

  // Use React Query for data fetching
  const {
    data: settings = [],
    isLoading,
    error,
    refetch,
  } = useSystemSettings();
  const updateSettingsMutation = useUpdateSystemSettings();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isDirty },
  } = useForm<SettingsFormData>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      siteName: "Ashram Management System",
      contactEmail: "admin@ashram.com",
      timezone: "Asia/Kolkata",
      language: "en",
      dateFormat: "DD/MM/YYYY",
      timeFormat: "12",
      appointmentSlotDuration: 30,
      maxAdvanceBookingDays: 30,
      allowCancellation: true,
      cancellationDeadlineHours: 24,
      enableNotifications: true,
      enableSmsNotifications: false,
      enableEmailNotifications: true,
      autoBackupEnabled: true,
      backupFrequencyHours: 24,
      maintenanceMode: false,
    },
  });

  const watchedValues = watch();

  // Convert settings array to form data
  const convertSettingsToFormData = useCallback((settings: SystemSetting[]) => {
    const formData: Partial<SettingsFormData> = {};

    settings.forEach((setting) => {
      const key = setting.key as keyof SettingsFormData;
      let value: string | boolean | number = setting.value;

      // Convert string values to appropriate types
      if (typeof value === "string") {
        if (value === "true") value = true;
        else if (value === "false") value = false;
        else if (!isNaN(Number(value)) && value !== "") value = Number(value);
      }

      (formData as Record<string, string | boolean | number>)[key] = value;
    });

    return formData;
  }, []);

  // Update form when settings are loaded
  useEffect(() => {
    if (settings.length > 0) {
      const formData = convertSettingsToFormData(settings);
      reset(formData);
    }
  }, [settings, reset, convertSettingsToFormData]);

  const onSubmit = async (data: SettingsFormData) => {
    const formData = new FormData();

    // Add all form data to FormData object
    Object.entries(data).forEach(([key, value]) => {
      formData.append(key, String(value));
    });

    updateSettingsMutation.mutate(formData, {
      onSuccess: () => {
        refetch(); // Refresh settings after update
      },
    });
  };

  if (isLoading) {
    return (
      <DashboardLayout title="General Settings" allowedRoles={["ADMIN"]}>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout title="General Settings" allowedRoles={["ADMIN"]}>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <RefreshCw className="mx-auto h-12 w-12 text-red-500 mb-4" />
            <h3 className="text-lg font-semibold text-red-600">
              Error loading settings
            </h3>
            <p className="text-sm text-muted-foreground mt-2">
              {error instanceof Error ? error.message : "An error occurred"}
            </p>
            <Button onClick={() => refetch()} className="mt-4">
              <RefreshCw className="mr-2 h-4 w-4" />
              Retry
            </Button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="General Settings" allowedRoles={["ADMIN"]}>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center space-x-4">
          <Button variant="outline" size="sm" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h2 className="text-2xl font-bold tracking-tight">
              General Settings
            </h2>
            <p className="text-muted-foreground">
              Configure system-wide settings and preferences
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Globe className="h-5 w-5" />
                <span>Basic Information</span>
              </CardTitle>
              <CardDescription>
                General information about your Ashram system
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="siteName">Site Name</Label>
                  <Input
                    id="siteName"
                    {...register("siteName")}
                    placeholder="Ashram Management System"
                  />
                  {errors.siteName && (
                    <p className="text-sm text-destructive">
                      {errors.siteName.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="contactEmail">Contact Email</Label>
                  <Input
                    id="contactEmail"
                    type="email"
                    {...register("contactEmail")}
                    placeholder="admin@ashram.com"
                  />
                  {errors.contactEmail && (
                    <p className="text-sm text-destructive">
                      {errors.contactEmail.message}
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="contactPhone">Contact Phone</Label>
                  <Input
                    id="contactPhone"
                    {...register("contactPhone")}
                    placeholder="+91 12345 67890"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="timezone">Timezone</Label>
                  <Select
                    value={watchedValues.timezone}
                    onValueChange={(value) =>
                      setValue("timezone", value, { shouldDirty: true })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Asia/Kolkata">
                        Asia/Kolkata (IST)
                      </SelectItem>
                      <SelectItem value="Asia/Dubai">
                        Asia/Dubai (GST)
                      </SelectItem>
                      <SelectItem value="Europe/London">
                        Europe/London (GMT)
                      </SelectItem>
                      <SelectItem value="America/New_York">
                        America/New_York (EST)
                      </SelectItem>
                      <SelectItem value="America/Los_Angeles">
                        America/Los_Angeles (PST)
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="siteDescription">Site Description</Label>
                <Textarea
                  id="siteDescription"
                  {...register("siteDescription")}
                  placeholder="A comprehensive management system for spiritual organizations..."
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          {/* Localization */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Globe className="h-5 w-5" />
                <span>Localization</span>
              </CardTitle>
              <CardDescription>Language and format preferences</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="language">Language</Label>
                  <Select
                    value={watchedValues.language}
                    onValueChange={(value) =>
                      setValue("language", value, { shouldDirty: true })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="en">English</SelectItem>
                      <SelectItem value="hi">हिन्दी</SelectItem>
                      <SelectItem value="ta">தமிழ்</SelectItem>
                      <SelectItem value="te">తెలుగు</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="dateFormat">Date Format</Label>
                  <Select
                    value={watchedValues.dateFormat}
                    onValueChange={(value) =>
                      setValue("dateFormat", value, { shouldDirty: true })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="DD/MM/YYYY">DD/MM/YYYY</SelectItem>
                      <SelectItem value="MM/DD/YYYY">MM/DD/YYYY</SelectItem>
                      <SelectItem value="YYYY-MM-DD">YYYY-MM-DD</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="timeFormat">Time Format</Label>
                  <Select
                    value={watchedValues.timeFormat}
                    onValueChange={(value) =>
                      setValue("timeFormat", value, { shouldDirty: true })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="12">12 Hour (AM/PM)</SelectItem>
                      <SelectItem value="24">24 Hour</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Appointment Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Clock className="h-5 w-5" />
                <span>Appointment Settings</span>
              </CardTitle>
              <CardDescription>
                Configure appointment booking behavior
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="appointmentSlotDuration">
                    Slot Duration (minutes)
                  </Label>
                  <Input
                    id="appointmentSlotDuration"
                    type="number"
                    min="15"
                    max="180"
                    step="15"
                    {...register("appointmentSlotDuration", {
                      valueAsNumber: true,
                    })}
                  />
                  {errors.appointmentSlotDuration && (
                    <p className="text-sm text-destructive">
                      {errors.appointmentSlotDuration.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="maxAdvanceBookingDays">
                    Max Advance Booking (days)
                  </Label>
                  <Input
                    id="maxAdvanceBookingDays"
                    type="number"
                    min="1"
                    max="365"
                    {...register("maxAdvanceBookingDays", {
                      valueAsNumber: true,
                    })}
                  />
                  {errors.maxAdvanceBookingDays && (
                    <p className="text-sm text-destructive">
                      {errors.maxAdvanceBookingDays.message}
                    </p>
                  )}
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="allowCancellation">
                      Allow Cancellations
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Allow users to cancel their appointments
                    </p>
                  </div>
                  <Switch
                    id="allowCancellation"
                    checked={watchedValues.allowCancellation}
                    onCheckedChange={(checked) =>
                      setValue("allowCancellation", checked, {
                        shouldDirty: true,
                      })
                    }
                  />
                </div>

                {watchedValues.allowCancellation && (
                  <div className="space-y-2">
                    <Label htmlFor="cancellationDeadlineHours">
                      Cancellation Deadline (hours)
                    </Label>
                    <Input
                      id="cancellationDeadlineHours"
                      type="number"
                      min="0"
                      max="168"
                      {...register("cancellationDeadlineHours", {
                        valueAsNumber: true,
                      })}
                    />
                    <p className="text-xs text-muted-foreground">
                      How many hours before appointment can users cancel
                    </p>
                    {errors.cancellationDeadlineHours && (
                      <p className="text-sm text-destructive">
                        {errors.cancellationDeadlineHours.message}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Notification Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Bell className="h-5 w-5" />
                <span>Notification Settings</span>
              </CardTitle>
              <CardDescription>Configure system notifications</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="enableNotifications">
                    Enable Notifications
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Master switch for all notifications
                  </p>
                </div>
                <Switch
                  id="enableNotifications"
                  checked={watchedValues.enableNotifications}
                  onCheckedChange={(checked) =>
                    setValue("enableNotifications", checked, {
                      shouldDirty: true,
                    })
                  }
                />
              </div>

              {watchedValues.enableNotifications && (
                <>
                  <Separator />
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="enableEmailNotifications">
                          Email Notifications
                        </Label>
                        <p className="text-sm text-muted-foreground">
                          Send notifications via email
                        </p>
                      </div>
                      <Switch
                        id="enableEmailNotifications"
                        checked={watchedValues.enableEmailNotifications}
                        onCheckedChange={(checked) =>
                          setValue("enableEmailNotifications", checked, {
                            shouldDirty: true,
                          })
                        }
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="enableSmsNotifications">
                          SMS Notifications
                        </Label>
                        <p className="text-sm text-muted-foreground">
                          Send notifications via SMS
                        </p>
                      </div>
                      <Switch
                        id="enableSmsNotifications"
                        checked={watchedValues.enableSmsNotifications}
                        onCheckedChange={(checked) =>
                          setValue("enableSmsNotifications", checked, {
                            shouldDirty: true,
                          })
                        }
                      />
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* System Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Database className="h-5 w-5" />
                <span>System Settings</span>
              </CardTitle>
              <CardDescription>
                System maintenance and backup settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="autoBackupEnabled">Auto Backup</Label>
                  <p className="text-sm text-muted-foreground">
                    Automatically backup system data
                  </p>
                </div>
                <Switch
                  id="autoBackupEnabled"
                  checked={watchedValues.autoBackupEnabled}
                  onCheckedChange={(checked) =>
                    setValue("autoBackupEnabled", checked, {
                      shouldDirty: true,
                    })
                  }
                />
              </div>

              {watchedValues.autoBackupEnabled && (
                <div className="space-y-2">
                  <Label htmlFor="backupFrequencyHours">
                    Backup Frequency (hours)
                  </Label>
                  <Input
                    id="backupFrequencyHours"
                    type="number"
                    min="1"
                    max="168"
                    {...register("backupFrequencyHours", {
                      valueAsNumber: true,
                    })}
                  />
                  {errors.backupFrequencyHours && (
                    <p className="text-sm text-destructive">
                      {errors.backupFrequencyHours.message}
                    </p>
                  )}
                </div>
              )}

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="maintenanceMode">Maintenance Mode</Label>
                  <p className="text-sm text-muted-foreground">
                    Put system in maintenance mode
                  </p>
                </div>
                <Switch
                  id="maintenanceMode"
                  checked={watchedValues.maintenanceMode}
                  onCheckedChange={(checked) =>
                    setValue("maintenanceMode", checked, { shouldDirty: true })
                  }
                />
              </div>

              {watchedValues.maintenanceMode && (
                <div className="space-y-2">
                  <Label htmlFor="maintenanceMessage">
                    Maintenance Message
                  </Label>
                  <Textarea
                    id="maintenanceMessage"
                    {...register("maintenanceMessage")}
                    placeholder="System is under maintenance. Please check back later."
                    rows={2}
                  />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex justify-end space-x-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => refetch()}
              disabled={updateSettingsMutation.isPending}
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Reset
            </Button>
            <Button
              type="submit"
              disabled={!isDirty || updateSettingsMutation.isPending}
            >
              {updateSettingsMutation.isPending ? (
                <>
                  <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-b-transparent" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Save Settings
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
}
