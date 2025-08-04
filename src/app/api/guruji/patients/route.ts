import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
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

    if (!["GURUJI", "ADMIN"].includes(session.user.role)) {
      return NextResponse.json(
        { message: "Insufficient permissions" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search");
    const limit = parseInt(searchParams.get("limit") || "50");

    // Get patients who have had appointments with this Guruji
    const whereClause: Record<string, unknown> = {
      appointments: {
        some: {
          gurujiId: session.user.id,
        },
      },
      isActive: true,
    };

    if (search) {
      whereClause.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
      ];
    }

    const patients = await prisma.user.findMany({
      where: whereClause,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        dateOfBirth: true,
      },
      orderBy: [
        { name: "asc" },
      ],
      take: limit,
    });

    // Get latest appointment for each patient
    const patientsWithAppointments = await Promise.all(
      patients.map(async (patient) => {
        const latestAppointment = await prisma.appointment.findFirst({
          where: {
            userId: patient.id,
            gurujiId: session.user.id,
          },
          select: {
            id: true,
            date: true,
            status: true,
          },
          orderBy: {
            date: "desc",
          },
        });

        return {
          ...patient,
          lastAppointment: latestAppointment,
        };
      })
    );

    // Also get patients currently in queue
    const queuePatients = await prisma.queueEntry.findMany({
      where: {
        gurujiId: session.user.id,
        status: {
          in: ["WAITING" as QueueStatus, "IN_PROGRESS" as QueueStatus],
        },
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            dateOfBirth: true,
          },
        },
      },
    });

    // Combine and deduplicate patients
    const allPatientsMap = new Map();

    // Add appointment patients
    patientsWithAppointments.forEach(patient => {
      allPatientsMap.set(patient.id, {
        id: patient.id,
        name: patient.name,
        email: patient.email,
        phone: patient.phone,
        dateOfBirth: patient.dateOfBirth,
        lastAppointment: patient.lastAppointment || null,
        inQueue: false,
      });
    });

    // Add queue patients
    queuePatients.forEach(queueEntry => {
      const existing = allPatientsMap.get(queueEntry.user.id);
      if (existing) {
        existing.inQueue = true;
      } else {
        allPatientsMap.set(queueEntry.user.id, {
          id: queueEntry.user.id,
          name: queueEntry.user.name,
          email: queueEntry.user.email,
          phone: queueEntry.user.phone,
          dateOfBirth: queueEntry.user.dateOfBirth,
          lastAppointment: null,
          inQueue: true,
        });
      }
    });

    const patientsArray = Array.from(allPatientsMap.values());

    return NextResponse.json({
      patients: patientsArray,
      total: patientsArray.length,
    });
  } catch (error) {
    console.error("Get patients error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}