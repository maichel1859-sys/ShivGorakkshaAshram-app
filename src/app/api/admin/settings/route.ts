import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";

const settingsUpdateSchema = z.object({
  siteName: z.string().min(1, "Site name is required"),
  siteDescription: z.string().optional(),
  contactEmail: z.string().email("Invalid email address"),
  contactPhone: z.string().optional(),
  timezone: z.string().min(1, "Timezone is required"),
  language: z.string().min(1, "Language is required"),
  dateFormat: z.string().min(1, "Date format is required"),
  timeFormat: z.string().min(1, "Time format is required"),
  appointmentSlotDuration: z.number().min(15, "Minimum 15 minutes").max(180, "Maximum 3 hours"),
  maxAdvanceBookingDays: z.number().min(1, "Minimum 1 day").max(365, "Maximum 365 days"),
  allowCancellation: z.boolean(),
  cancellationDeadlineHours: z.number().min(0, "Cannot be negative").max(168, "Maximum 1 week"),
  enableNotifications: z.boolean(),
  enableSmsNotifications: z.boolean(),
  enableEmailNotifications: z.boolean(),
  autoBackupEnabled: z.boolean(),
  backupFrequencyHours: z.number().min(1, "Minimum 1 hour").max(168, "Maximum 1 week"),
  maintenanceMode: z.boolean(),
  maintenanceMessage: z.string().optional(),
});

// Get all system settings
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      );
    }

    if (session.user.role !== "ADMIN") {
      return NextResponse.json(
        { message: "Insufficient permissions" },
        { status: 403 }
      );
    }

    const settings = await prisma.systemSetting.findMany({
      orderBy: [
        { category: "asc" },
        { key: "asc" },
      ],
    });

    // Group settings by category for easier frontend handling
    const groupedSettings = settings.reduce((acc, setting) => {
      const category = setting.category || 'uncategorized';
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(setting);
      return acc;
    }, {} as Record<string, typeof settings>);

    return NextResponse.json({
      settings,
      groupedSettings,
      total: settings.length,
    });
  } catch (error) {
    console.error("Get system settings error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

// Update system settings
export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      );
    }

    if (session.user.role !== "ADMIN") {
      return NextResponse.json(
        { message: "Insufficient permissions" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const validatedData = settingsUpdateSchema.parse(body);

    // Define setting mappings with categories and descriptions
    const settingMappings = [
      { key: "siteName", category: "general", description: "Name of the ashram/organization" },
      { key: "siteDescription", category: "general", description: "Description of the organization" },
      { key: "contactEmail", category: "general", description: "Primary contact email" },
      { key: "contactPhone", category: "general", description: "Primary contact phone" },
      { key: "timezone", category: "localization", description: "System timezone" },
      { key: "language", category: "localization", description: "Default language" },
      { key: "dateFormat", category: "localization", description: "Date display format" },
      { key: "timeFormat", category: "localization", description: "Time display format (12/24 hour)" },
      { key: "appointmentSlotDuration", category: "appointments", description: "Default appointment duration in minutes" },
      { key: "maxAdvanceBookingDays", category: "appointments", description: "Maximum days in advance for booking" },
      { key: "allowCancellation", category: "appointments", description: "Allow users to cancel appointments" },
      { key: "cancellationDeadlineHours", category: "appointments", description: "Hours before appointment when cancellation is allowed" },
      { key: "enableNotifications", category: "notifications", description: "Master switch for notifications" },
      { key: "enableSmsNotifications", category: "notifications", description: "Enable SMS notifications" },
      { key: "enableEmailNotifications", category: "notifications", description: "Enable email notifications" },
      { key: "autoBackupEnabled", category: "system", description: "Enable automatic backups" },
      { key: "backupFrequencyHours", category: "system", description: "Hours between automatic backups" },
      { key: "maintenanceMode", category: "system", description: "Put system in maintenance mode" },
      { key: "maintenanceMessage", category: "system", description: "Message to display during maintenance" },
    ];

    // Get existing settings for audit logging
    const existingSettings = await prisma.systemSetting.findMany({
      where: {
        key: {
          in: settingMappings.map(s => s.key)
        }
      }
    });

    const existingSettingsMap = existingSettings.reduce((acc, setting) => {
      acc[setting.key] = setting.value;
      return acc;
    }, {} as Record<string, string>);

    // Prepare upsert operations
    const upsertOperations = settingMappings.map(mapping => {
      const value = validatedData[mapping.key as keyof typeof validatedData];
      const stringValue = value !== undefined ? String(value) : "";
      
      return prisma.systemSetting.upsert({
        where: { key: mapping.key },
        update: { 
          value: stringValue,
          updatedAt: new Date(),
        },
        create: {
          key: mapping.key,
          value: stringValue,
          type: "string", // Default type for settings
          category: mapping.category,
          description: mapping.description,
        },
      });
    });

    // Execute all upserts in a transaction
    const updatedSettings = await prisma.$transaction(upsertOperations);

    // Create audit log for settings changes
    const changedSettings = settingMappings.filter(mapping => {
      const newValue = String(validatedData[mapping.key as keyof typeof validatedData] || "");
      const oldValue = existingSettingsMap[mapping.key] || "";
      return newValue !== oldValue;
    });

    if (changedSettings.length > 0) {
      const auditData = {
        old: {} as Record<string, string>,
        new: {} as Record<string, string>,
      };

      changedSettings.forEach(mapping => {
        const key = mapping.key;
        auditData.old[key] = existingSettingsMap[key] || "";
        auditData.new[key] = String(validatedData[key as keyof typeof validatedData] || "");
      });

      await prisma.auditLog.create({
        data: {
          userId: session.user.id,
          action: "UPDATE_SYSTEM_SETTINGS",
          resource: "SYSTEM_SETTINGS",
          resourceId: "system",
          oldData: auditData.old,
          newData: auditData.new,
        },
      });
    }

    return NextResponse.json({
      message: "Settings updated successfully",
      settings: updatedSettings,
      changedCount: changedSettings.length,
    });
  } catch (error) {
    console.error("Update system settings error:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: "Validation error", errors: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

// Get a specific setting
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      );
    }

    if (session.user.role !== "ADMIN") {
      return NextResponse.json(
        { message: "Insufficient permissions" },
        { status: 403 }
      );
    }

    const { key } = await req.json();

    if (!key) {
      return NextResponse.json(
        { message: "Setting key is required" },
        { status: 400 }
      );
    }

    const setting = await prisma.systemSetting.findUnique({
      where: { key },
    });

    if (!setting) {
      return NextResponse.json(
        { message: "Setting not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ setting });
  } catch (error) {
    console.error("Get system setting error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}