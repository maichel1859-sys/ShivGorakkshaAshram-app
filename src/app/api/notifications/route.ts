import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";

const createNotificationSchema = z.object({
  userId: z.string().min(1, "User ID is required"),
  title: z.string().min(1, "Title is required"),
  message: z.string().min(1, "Message is required"),
  type: z.enum(["appointment", "remedy", "queue", "system", "reminder"]),
  data: z.record(z.any()).optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH"]).default("MEDIUM"),
  sendEmail: z.boolean().default(false),
  sendSms: z.boolean().default(false),
});

// Get notifications for a user
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const unreadOnly = searchParams.get("unreadOnly") === "true";
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");
    const type = searchParams.get("type");

    const whereClause: Record<string, unknown> = {
      userId: session.user.id,
    };

    if (unreadOnly) {
      whereClause.read = false;
    }

    if (type) {
      whereClause.type = type;
    }

    const [notifications, totalCount, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where: whereClause,
        orderBy: {
          createdAt: "desc",
        },
        take: limit,
        skip: offset,
      }),
      prisma.notification.count({ where: whereClause }),
      prisma.notification.count({
        where: {
          userId: session.user.id,
          read: false,
        },
      }),
    ]);

    return NextResponse.json({
      notifications,
      total: totalCount,
      unread: unreadCount,
      limit,
      offset,
    });
  } catch (error) {
    console.error("Get notifications error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

// Create a new notification
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      );
    }

    // Only allow coordinators, gurujis, and admins to create notifications for others
    if (!["COORDINATOR", "GURUJI", "ADMIN"].includes(session.user.role)) {
      return NextResponse.json(
        { message: "Insufficient permissions" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const validatedData = createNotificationSchema.parse(body);

    // Verify target user exists
    const targetUser = await prisma.user.findUnique({
      where: { id: validatedData.userId },
      select: { id: true, email: true, phone: true, name: true },
    });

    if (!targetUser) {
      return NextResponse.json(
        { message: "Target user not found" },
        { status: 404 }
      );
    }

    // Create notification
    const notification = await prisma.notification.create({
      data: {
        userId: validatedData.userId,
        title: validatedData.title,
        message: validatedData.message,
        type: validatedData.type,
        data: validatedData.data || {},
      },
    });

    // Handle email notification
    if (validatedData.sendEmail && targetUser.email) {
      try {
        // TODO: Implement actual email sending
        // await sendEmail({
        //   to: targetUser.email,
        //   subject: validatedData.title,
        //   body: validatedData.message,
        // });
        
        console.log(`Email notification sent to ${targetUser.email}`);
      } catch (emailError) {
        console.error("Failed to send email notification:", emailError);
      }
    }

    // Handle SMS notification
    if (validatedData.sendSms && targetUser.phone) {
      try {
        // TODO: Implement actual SMS sending
        // await sendSMS({
        //   to: targetUser.phone,
        //   message: `${validatedData.title}: ${validatedData.message}`,
        // });
        
        console.log(`SMS notification sent to ${targetUser.phone}`);
      } catch (smsError) {
        console.error("Failed to send SMS notification:", smsError);
      }
    }

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "CREATE_NOTIFICATION",
        resource: "NOTIFICATION",
        resourceId: notification.id,
        newData: {
          targetUserId: validatedData.userId,
          targetUserName: targetUser.name,
          title: validatedData.title,
          type: validatedData.type,
          priority: validatedData.priority,
        },
      },
    });

    return NextResponse.json(
      {
        message: "Notification created successfully",
        notification,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Create notification error:", error);

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