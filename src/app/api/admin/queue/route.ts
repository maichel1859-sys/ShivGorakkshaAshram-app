import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { QueueStatus } from "@prisma/client";

export async function GET(req: NextRequest) {
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

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const search = searchParams.get("search");
    const limit = parseInt(searchParams.get("limit") || "20");
    const offset = parseInt(searchParams.get("offset") || "0");

    const whereClause: Record<string, unknown> = {};

    if (status && status !== "all") {
      whereClause.status = status as QueueStatus;
    }

    if (search) {
      whereClause.OR = [
        { notes: { contains: search, mode: "insensitive" } },
        {
          appointment: {
            reason: { contains: search, mode: "insensitive" }
          }
        },
      ];
    }

    const [queueEntries, totalCount] = await Promise.all([
      prisma.queueEntry.findMany({
        where: whereClause,
        include: {
          appointment: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
              guruji: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
            },
          },
        },
        orderBy: { position: "asc" },
        take: limit,
        skip: offset,
      }),
      prisma.queueEntry.count({ where: whereClause }),
    ]);

    return NextResponse.json({
      queueEntries,
      totalCount,
      hasMore: offset + limit < totalCount,
    });
  } catch (error) {
    console.error("Error fetching queue entries:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
} 